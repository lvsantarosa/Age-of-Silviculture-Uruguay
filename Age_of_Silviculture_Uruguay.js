//Original Code: https://github.com/celsohlsj/gee_brazil_sv/blob/master/gee_brazil_sv_toolkit_download.js

//Google Earth Engine code: https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc


// Silviculture age for Uruguay - Mapbiomas Pampa v2
// 
// ******************************************************************************************
//  * Institution:  Sao Paulo State University 
//  * Purpose:      Map the increment, extent, age and loss of silvivulture in Uruguay
//  * Author:       Lucas Vituri Santarosa
//  * Email:        lucas.santarosa@unesp.br
//  * Adapted from Silva Junior et al. 2020
// ******************************************************************************************

// 0. MapBiomas Data (Colection 2.0)
var UY =  ee.FeatureCollection('projects/ee-lucassantarosa2/assets/UY');
var mapbiomas = ee.Image('projects/MapBiomas_Pampa/public/collection2/mapbiomas_pampa_collection2_integration_v1').byte(); 

// 1. Reclassifying MapBiomas Data #Step 1
var empty = ee.Image().byte();

for (var i=1; i<22; i++)  {
    var y = 2000+i;
    var year = 'classification_'+y;
    var forest = mapbiomas.select(year).eq(9);//Code for silviculture 
    empty = empty.addBands(forest);
}
var mapbiomas_forest = empty.select(empty.bandNames().slice(1));

// 1.1 Other uses and Water Mask
var empty = ee.Image().byte();
for (var i=1; i<22; i++)  {
    var y = 2000+i;
    var year = 'classification_'+y;
    var forest = mapbiomas.select(year).remap([01,02,03,04,10,11,12,14,22,26,27,33],[1,1,1,1,1,1,1,1,1,1,1,1]).rename(ee.String(year)).unmask(0);
    empty = empty.addBands(forest);
}
var anthropic_mask = empty.select(empty.bandNames().slice(1));

var w_mask = ee.Image("JRC/GSW1_3/GlobalSurfaceWater").select("max_extent").clip(UY).remap([0,1],[1,0]);

// 2. Mapping the Annual Increment  #Step 2
var empty = ee.Image().byte();
for (var i=0; i<20; i++)  {
    var y1 = 2001+i;
    var y2 = 2002+i;
    var year1 = 'classification_'+y1;
    var year2 = 'classification_'+y2;
    var a_mask = anthropic_mask.select(year1);
    var forest1 = mapbiomas_forest.select(year1).remap([0,1],[0,2]);
    var forest2 = mapbiomas_forest.select(year2);
    var sforest = forest1.add(forest2);
    sforest = sforest.remap([0,1,2,3],[0,1,0,0]).multiply(a_mask).multiply(w_mask).rename(ee.String(year2));
    empty = empty.addBands(sforest);
}
var sforest_all = empty.select(empty.bandNames().slice(1));

// 3. Mapping the Annual Extent   #Step 3
var empty = ee.Image().byte();
var ext = sforest_all.select('classification_2002');
ext = ext.rename(ee.String('classification_2002'));
empty = empty.addBands(ext);
for (var i=1; i<20; i++)  {
    var y = 2002+i;
    var y2 = 2001+i;
    var year = 'classification_'+y;
    var year2 = 'classification_'+y2;
    var sforest = sforest_all.select(year);
    var acm_forest = empty.select(year2).add(sforest);
    var oldvalues = ee.List([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]);
    var newvalues = ee.List([0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
    var remap = acm_forest.remap(oldvalues,newvalues);
    empty = empty.addBands(remap.multiply(mapbiomas_forest.select(year)).rename(ee.String(year)));
}
var sforest_ext = empty.select(empty.bandNames().slice(1));

// 3.1  Loss
var empty = ee.Image().byte();
var empty2 = ee.Image().byte();
var ext = sforest_all.select('classification_2002');
ext = ext.rename(ee.String('classification_2002'));
empty = empty.addBands(ext);
for (var i=1; i<20; i++)  {
    var y = 2002+i;
    var y2 = 2001+i;
    var year = 'classification_'+y;
    var year2 = 'classification_'+y2;
    var sforest = sforest_all.select(year);
    var acm_forest = empty.select(year2).add(sforest);
    var oldvalues = ee.List([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35]);
    var newvalues = ee.List([0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
    var remap = acm_forest.remap(oldvalues,newvalues);
    var mask = mapbiomas_forest.select(year).remap([0,1],[500,1]);
    var loss = remap.add(mask).remap([1,2,500,501],[0,0,0,1]);
    empty2 = empty2.addBands(loss.rename(ee.String(year)));
    empty = empty.addBands(remap.multiply(mapbiomas_forest.select(year)).rename(ee.String(year)));
}
var sforest_loss = empty2.select(empty2.bandNames().slice(1));

// 4. Calculating and Mapping the Age  #Step 4
var empty = ee.Image().byte();
var age = sforest_ext.select('classification_2002');
age = age.rename(ee.String('classification_2002'));
empty = empty.addBands(age);
empty = empty.slice(1);
var temp = empty;
for (var i=1; i<20; i++)  {
    var y = 2002+i;
    var year = 'classification_'+y;
    var sforest = sforest_ext.select(year);
    var ageforest = empty.add(sforest);
    var fYear = mapbiomas_forest.select(year);
    ageforest = ageforest.multiply(fYear);
    temp = temp.addBands(ageforest.rename(ee.String(year)));
    var empty = ageforest;
}
var sforest_age = temp;

print(sforest_age)

//See the age of forestation 

var class2021 = sforest_age.select('classification_2021')

Map.addLayer(class2021)
Map.centerObject(UY)

// Export Products Data to Google Drive

Export.image.toDrive({
          image: sforest_all,
          description: 'Silviculture_increment', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

Export.image.toDrive({
          image: sforest_ext,
          description: 'Silviculture_extent', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

Export.image.toDrive({
         image: sforest_age,
          description: 'Silviculture_age', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

Export.image.toDrive({
         image: sforest_loss,
          description: 'Silviculture_loss', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

//Export Products Data to Asset

Export.image.toAsset({
          image: sforest_all,
          description: 'Silviculture_increment', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

Export.image.toAsset({
          image: sforest_ext,
          description: 'Silviculture_extent', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

Export.image.toAsset({
          image: sforest_loss,
          description: 'Silviculture_loss', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});

Export.image.toAsset({
          image: sforest_age,
          description: 'Silviculture_age', 
          scale: 30, 
          region: UY,
          maxPixels:1e13
});
