// Original Code: https://github.com/celsohlsj/gee_brazil_sv/blob/master/gee_brazil_sv_toolkit_download.js
//
// Google Earth Engine code: https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc


// Silviculture increment, extent, loss and age for Uruguay - MapBiomas Uruguay Collection 3
//
// ******************************************************************************************
//  * Laboratory:   Laboratorio de Recursos Hidricos y Geotecnologias (LRHG)
//  * Institution:  Escuela de Agronomia - Pontificia Universidad Catolica de Valparaiso
//  * Purpose:      Map the increment, extent, age and loss of silviculture in Uruguay,
//  *               separating Pinus and Eucalyptus plantations
//  * Author:       Lucas Vituri Santarosa
//  * Email:        lucas.vituri@pucv.cl
//  * Adapted from: Silva Junior et al. 2020 (https://doi.org/10.1038/s41597-020-00600-4)
//  * Data:         MapBiomas Uruguay Collection 3 (1985-2024)
//  * Updated:      2026
// ******************************************************************************************


// ==========================================================================================
// 0. Settings
// ==========================================================================================

// MapBiomas Uruguay Collection 3 (released Nov/2025, annual coverage 1985-2024).
var COLLECTION = 'projects/mapbiomas-public/assets/uruguay/lulc/collection3/' +
                 'mapbiomas_uruguay_collection3_coverage_v1';

// Area of interest (replace with your own Uruguay polygon if you do not have this asset).
var AOI = ee.FeatureCollection('projects/ee-lucassantarosa2/assets/UY');

// Time span. The collection covers 1985-2024; increment/extent/loss/age series start
// at FIRST_YEAR + 1, because the first year is only used as the "before" reference.
var FIRST_YEAR = 1985;
var LAST_YEAR = 2024;

// Water mask (JRC Global Surface Water).
var WATER_DATASET = 'JRC/GSW1_4/GlobalSurfaceWater';

// Export settings.
var SCALE = 30;
var MAX_PIXELS = 1e13;
var EXPORT_TO_DRIVE = true;   // set to false to skip the Google Drive tasks
var EXPORT_TO_ASSET = false;  // set to true to also write Earth Engine assets
var ASSET_FOLDER = 'projects/ee-lucassantarosa2/assets';  // destination for toAsset exports
var EXPORT_SPECIES = true;    // export Pinus/Eucalyptus products in addition to all silviculture

// --- MapBiomas Uruguay Collection 3 legend ------------------------------------------------
// Collection 3 maps forest plantations by genus, in three classes:
//     79 - Pinus plantation          (#67671c)
//     80 - Eucalyptus plantation     (#886827)
//     83 - Other forestry uses       (#ab8231)
// The remaining classes of the Collection 3 legend are:
//      3 - Closed forest and closed shrubland
//     11 - Flooded grasslands and swampy areas
//     12 - Grassland
//     15 - Pasture
//     18 - Agriculture
//     22 - Non-vegetated area
//     33 - River, lake or ocean
var CLASS_PINUS = 79;
var CLASS_EUCALYPTUS = 80;
var CLASS_OTHER_FORESTRY = 83;

// Classes accepted as previous land cover for a valid plantation increment. As in the
// original toolkit, this is the set of all non-silviculture classes of the legend: a pixel
// only enters the series when it changes from one of these classes into silviculture.
var PREVIOUS_COVER_CLASSES = [3, 11, 12, 15, 18, 22, 33];

// Products to be generated: label -> MapBiomas classes treated as the target.
var TARGETS = {
    'all': [CLASS_PINUS, CLASS_EUCALYPTUS, CLASS_OTHER_FORESTRY],
    'pinus': [CLASS_PINUS],
    'eucalyptus': [CLASS_EUCALYPTUS]
};


// ==========================================================================================
// 1. Input data and masks  #Step 1
// ==========================================================================================

var mapbiomas = ee.Image(COLLECTION).byte();

// Sanity check on the first run: the Console should list classification_1985 ... _2024.
print('Collection bands', mapbiomas.bandNames());

// List of years as a plain JavaScript array, so the loops below stay client-side.
var years = [];
for (var y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    years.push(y);
}

var bandName = function (year) {
    return 'classification_' + year;
};

// Binary stack (1 = target class, 0 = anything else), one band per year.
var binaryStack = function (classes) {
    var bands = years.map(function (year) {
        var band = bandName(year);
        return mapbiomas.select(band)
            .remap(classes, ee.List.repeat(1, classes.length), 0)
            .rename(band);
    });
    return ee.Image.cat(bands).byte();
};

// 1.1 Previous land cover mask (former "anthropic mask") and water mask
var previous_cover_mask = binaryStack(PREVIOUS_COVER_CLASSES);

var w_mask = ee.Image(WATER_DATASET).select('max_extent').clip(AOI).remap([0, 1], [1, 0]);


// ==========================================================================================
// 2-4. Increment, extent, loss and age for one target
// ==========================================================================================
//
// 2. Annual increment  #Step 2 - pixel that was an eligible cover in t-1 and is silviculture in t
// 3. Annual extent     #Step 3 - increments accumulated through time, still silviculture in t
// 3.1 Annual loss             - pixel already tracked that is no longer silviculture in t
// 4. Age               #Step 4 - consecutive years the pixel has been under silviculture
//
var silvicultureSeries = function (classes) {

    var silviculture = binaryStack(classes);

    var increment_bands = [];
    var extent_bands = [];
    var loss_bands = [];
    var age_bands = [];

    var extent_previous = null;
    var age_previous = null;

    for (var i = 1; i < years.length; i++) {
        var year = bandName(years[i]);
        var year_before = bandName(years[i - 1]);

        // Step 2 - increment
        var before = silviculture.select(year_before).remap([0, 1], [0, 2]);
        var now = silviculture.select(year);
        var increment = before.add(now)
            .remap([0, 1, 2, 3], [0, 1, 0, 0])            // 1 only where 0 -> 1
            .multiply(previous_cover_mask.select(year_before))
            .multiply(w_mask)
            .rename(year);
        increment_bands.push(increment);

        if (extent_previous === null) {
            // First year of the series: extent and age are the increment itself.
            extent_previous = increment.rename(year);
            age_previous = increment.rename(year);
            extent_bands.push(extent_previous);
            age_bands.push(age_previous);
            loss_bands.push(increment.multiply(0).rename(year));
            continue;
        }

        // Step 3 - accumulated, then intersected with the current silviculture map
        var tracked = extent_previous.add(increment).gt(0);
        var extent = tracked.multiply(now).rename(year);

        // Step 3.1 - loss: tracked pixel that is not silviculture anymore
        var loss = tracked.and(now.not()).rename(year);

        // Step 4 - age
        var age = age_previous.add(extent).multiply(now).rename(year);

        extent_bands.push(extent);
        loss_bands.push(loss);
        age_bands.push(age);

        extent_previous = extent;
        age_previous = age;
    }

    return {
        increment: ee.Image.cat(increment_bands).byte(),
        extent: ee.Image.cat(extent_bands).byte(),
        loss: ee.Image.cat(loss_bands).byte(),
        age: ee.Image.cat(age_bands).byte()
    };
};

var products = {};
Object.keys(TARGETS).forEach(function (label) {
    products[label] = silvicultureSeries(TARGETS[label]);
});

print('Silviculture age (all plantations)', products.all.age);


// ==========================================================================================
// 5. Visualization
// ==========================================================================================

var last_band = bandName(LAST_YEAR);
var max_age = LAST_YEAR - FIRST_YEAR;

var ageVis = {
    min: 1,
    max: max_age,
    palette: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837']  // young -> old
};

Map.centerObject(AOI, 6);
Map.addLayer(AOI.style({color: '000000', fillColor: '00000000', width: 1}), {}, 'Uruguay');

// Plantation classes of the last year, with the official MapBiomas colors.
Map.addLayer(
    mapbiomas.select(last_band).eq(CLASS_PINUS).selfMask(),
    {palette: ['#67671c']}, 'Pinus plantation ' + LAST_YEAR, false);
Map.addLayer(
    mapbiomas.select(last_band).eq(CLASS_EUCALYPTUS).selfMask(),
    {palette: ['#886827']}, 'Eucalyptus plantation ' + LAST_YEAR, false);
Map.addLayer(
    mapbiomas.select(last_band).eq(CLASS_OTHER_FORESTRY).selfMask(),
    {palette: ['#ab8231']}, 'Other forestry uses ' + LAST_YEAR, false);

// Age in the last year, per target.
Map.addLayer(products.pinus.age.select(last_band).selfMask(), ageVis,
             'Pinus age (' + LAST_YEAR + ', years)', false);
Map.addLayer(products.eucalyptus.age.select(last_band).selfMask(), ageVis,
             'Eucalyptus age (' + LAST_YEAR + ', years)', false);
Map.addLayer(products.all.age.select(last_band).selfMask(), ageVis,
             'Silviculture age (' + LAST_YEAR + ', years)');

// Legend for the age palette
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 10px'}});
legend.add(ui.Label('Silviculture age in ' + LAST_YEAR + ' (years)',
                    {fontWeight: 'bold', fontSize: '13px', margin: '0 0 6px 0'}));

var legendRow = function (color, label) {
    return ui.Panel({
        widgets: [
            ui.Label('', {backgroundColor: color, padding: '8px', margin: '0 6px 4px 0'}),
            ui.Label(label, {margin: '0 0 4px 0', fontSize: '12px'})
        ],
        layout: ui.Panel.Layout.Flow('horizontal')
    });
};

var step = Math.ceil(max_age / 5);
for (var k = 0; k < 5; k++) {
    var from = 1 + k * step;
    var to = Math.min(max_age, (k + 1) * step);
    if (from > max_age) {
        break;
    }
    legend.add(legendRow(ageVis.palette[k], from + ' - ' + to));
}
Map.add(legend);


// ==========================================================================================
// 6. Export products
// ==========================================================================================
//
// One multi-band raster per product, with one band per year
// (classification_1986 ... classification_2024). Band values:
//     increment -> 1 = plantation established in that year
//     extent    -> 1 = plantation present and tracked since its establishment
//     loss      -> 1 = plantation lost in that year
//     age       -> number of consecutive years under silviculture
//
var exportProducts = function (label, series) {
    var suffix = (label === 'all') ? '' : '_' + label;

    var items = [
        ['Silviculture_increment' + suffix, series.increment],
        ['Silviculture_extent' + suffix, series.extent],
        ['Silviculture_loss' + suffix, series.loss],
        ['Silviculture_age' + suffix, series.age]
    ];

    items.forEach(function (item) {
        var description = item[0];
        var image = item[1];

        if (EXPORT_TO_DRIVE) {
            Export.image.toDrive({
                image: image,
                description: description,
                scale: SCALE,
                region: AOI,
                maxPixels: MAX_PIXELS
            });
        }

        if (EXPORT_TO_ASSET) {
            Export.image.toAsset({
                image: image,
                description: description,
                assetId: ASSET_FOLDER + '/' + description,
                scale: SCALE,
                region: AOI,
                maxPixels: MAX_PIXELS
            });
        }
    });
};

exportProducts('all', products.all);

if (EXPORT_SPECIES) {
    exportProducts('pinus', products.pinus);
    exportProducts('eucalyptus', products.eucalyptus);
}
