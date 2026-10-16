# Age of Silviculture in Uruguay

> Google Earth Engine script to map the **annual increment, extent, loss and age** of silviculture (forest plantations) in Uruguay — **separating Pinus and Eucalyptus** — from the MapBiomas Uruguay land-use classification.

[![Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-JavaScript-4285F4?logo=googleearthengine&logoColor=white)](https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc)
[![Data](https://img.shields.io/badge/data-MapBiomas%20Uruguay%20Collection%203-2E8B57)](https://uruguay.mapbiomas.org)
[![Period](https://img.shields.io/badge/period-1985--2024-lightgrey)]()
[![Resolution](https://img.shields.io/badge/resolution-30%20m-lightgrey)]()
[![Updated](https://img.shields.io/badge/updated-2026-blue)]()
[![Adapted from](https://img.shields.io/badge/adapted%20from-Silva%20Junior%20et%20al.%202020-orange)](https://doi.org/10.1038/s41597-020-00600-4)

---

## Overview

Forest plantations (mainly *Eucalyptus* and *Pinus*) have expanded rapidly across the Uruguayan
Pampa. Knowing **where** plantations are is only part of the picture — management, carbon stocks
and harvest cycles all depend on **how old** each stand is, and on **which genus** was planted.

This repository adapts the Brazilian secondary-vegetation toolkit of
[Silva Junior et al. (2020)](https://doi.org/10.1038/s41597-020-00600-4) to the forest plantation
classes of [MapBiomas Uruguay](https://uruguay.mapbiomas.org) **Collection 3**, producing a
pixel-level (30 m) annual history of silviculture in Uruguay for **1985–2024**.

| Product | What it answers |
| --- | --- |
| **Increment** | In which year was the plantation established on this pixel? |
| **Extent** | Is this pixel part of a plantation tracked since its establishment? |
| **Loss** | In which year was the plantation harvested / converted? |
| **Age** | How many years has the plantation stood on this pixel? |

Each product is generated three times: for **all plantations**, for **Pinus only** and for
**Eucalyptus only**.

---

## Data: MapBiomas Uruguay Collection 3

The script reads [MapBiomas Uruguay](https://uruguay.mapbiomas.org) **Collection 3** (released
November 2025), the collection dedicated to Uruguay:

| | |
| --- | --- |
| Asset | `projects/mapbiomas-public/assets/uruguay/lulc/collection3/mapbiomas_uruguay_collection3_coverage_v1` |
| Period | **1985–2024** (40 annual bands) |
| Resolution | 30 m |
| Plantation classes | `79` Pinus · `80` Eucalyptus · `83` Other forestry uses |
| Maximum measurable age | **39 years** |

> **Note.** Collection 3 has no single "silviculture" class: plantations are mapped by genus, so
> the three codes above are what this script targets.

### Collection 3 legend

Collection 3 uses ten classes; the three plantation classes are the targets of this script.

| Code | Class | Role here |
| --- | --- | --- |
| `79` | Pinus plantation | target (Pinus, and part of "all") |
| `80` | Eucalyptus plantation | target (Eucalyptus, and part of "all") |
| `83` | Other forestry uses | part of "all" |
| `3` | Closed forest and closed shrubland | eligible previous cover |
| `11` | Flooded grasslands and swampy areas | eligible previous cover |
| `12` | Grassland | eligible previous cover |
| `15` | Pasture | eligible previous cover |
| `18` | Agriculture | eligible previous cover |
| `22` | Non-vegetated area | eligible previous cover |
| `33` | River, lake or ocean | eligible previous cover |

"Eligible previous cover" replaces the *anthropic mask* of the original toolkit: a pixel only
enters the series when it changes from one of those classes into a plantation class. Because the
set is simply "every non-plantation class of the legend", it keeps the original behaviour while
remaining valid for the new legend.

---

## Data sources

| Dataset | Use | Asset |
| --- | --- | --- |
| MapBiomas Uruguay, Collection 3 | Annual land-use/land-cover classification, 1985–2024 | `projects/mapbiomas-public/assets/uruguay/lulc/collection3/mapbiomas_uruguay_collection3_coverage_v1` |
| JRC Global Surface Water v1.4 | Water mask (`max_extent`) to exclude permanent/seasonal water | `JRC/GSW1_4/GlobalSurfaceWater` |
| Uruguay boundary | Area of interest | `projects/ee-lucassantarosa2/assets/UY` (user asset) |

> **Note.** The boundary is a private Earth Engine asset. Replace `AOI` with your own country
> polygon (e.g. `FAO/GAUL/2015/level0` filtered to Uruguay) if you do not have access to it.

---

## How it works

The script follows four steps, mirroring the original toolkit:

```
MapBiomas Uruguay Collection 3 (1985-2024)
        │
  ┌─────┴───────────────────────────────────┐
  │ Step 1 — Reclassify                     │  79 / 80 / 83 -> 1
  │          + previous cover + water mask  │  water pixels removed
  └─────┬───────────────────────────────────┘
        │
  ┌─────┴───────────────┐
  │ Step 2 — Increment  │  eligible cover in t-1 and plantation in t
  └─────┬───────────────┘
        │
  ┌─────┴───────────────┐
  │ Step 3 — Extent     │  cumulative plantation area, still plantation in t
  │       3.1 — Loss    │  tracked pixel that is no longer plantation
  └─────┬───────────────┘
        │
  ┌─────┴───────────────┐
  │ Step 4 — Age        │  years accumulated since establishment
  └─────────────────────┘
```

**Step 1 — Reclassification and masks.** Each annual band is reduced to a binary plantation layer
for the target classes. The eligible-previous-cover stack and the JRC water mask constrain where
an establishment can be counted.

**Step 2 — Annual increment.** A pixel is counted as new plantation in year *t* when it was an
eligible cover in *t-1* and is a plantation in *t*.

**Step 3 — Annual extent and loss.** Increments are accumulated through time and intersected with
the current-year plantation map. Pixels that drop out of the plantation classes are recorded as
loss in the year they disappear.

**Step 4 — Age.** For every year, the extent layer is added to the previous accumulated age, so
each pixel carries the number of consecutive years it has been under silviculture. The band
`classification_2024` therefore holds the plantation age (in years) at the end of the series.

> **Reading the per-genus products.** Pinus and Eucalyptus ages count *consecutive years under
> that genus*. A stand replanted with the other genus restarts its age in the per-genus product,
> while the "all plantations" product keeps counting.

---

## Repository contents

```
.
├── Age_of_Silviculture_Uruguay.js   # the complete Earth Engine script
├── CITATION.cff                     # how to cite this repository
└── README.md
```

---

## Usage

1. Open the script directly in the Earth Engine Code Editor:
   **https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc**
   (or copy `Age_of_Silviculture_Uruguay.js` into a new script).
2. Make sure you have access to a Uruguay boundary asset (edit `AOI` if needed). The MapBiomas
   Uruguay Collection 3 asset is public.
3. Click **Run** to inspect the age and plantation layers on the map.
4. Open the **Tasks** tab to launch the exports you want.

### Settings

All parameters live in the `0. Settings` block at the top of the script:

| Variable | Meaning |
| --- | --- |
| `COLLECTION` | MapBiomas asset to read |
| `AOI` | study area |
| `FIRST_YEAR` / `LAST_YEAR` | time span (1985 / 2024) |
| `CLASS_PINUS`, `CLASS_EUCALYPTUS`, `CLASS_OTHER_FORESTRY` | plantation codes (79 / 80 / 83) |
| `PREVIOUS_COVER_CLASSES` | classes accepted as cover before establishment |
| `TARGETS` | which products to build (all / pinus / eucalyptus) |
| `EXPORT_TO_DRIVE`, `EXPORT_TO_ASSET`, `EXPORT_SPECIES` | which export tasks to create |
| `SCALE` | export resolution (30 m) |

### Outputs

Each export is a multi-band 30 m raster with one band per year (`classification_1986` …
`classification_2024`):

| Export description | Band values |
| --- | --- |
| `Silviculture_increment` | 1 = plantation established in that year |
| `Silviculture_extent` | 1 = plantation present and tracked |
| `Silviculture_loss` | 1 = plantation lost in that year |
| `Silviculture_age` | age in years (1–39) |

With `EXPORT_SPECIES = true` the same four products are also written with the suffixes
`_pinus` and `_eucalyptus` (e.g. `Silviculture_age_eucalyptus`).

Exports go to **Google Drive** by default; set `EXPORT_TO_ASSET = true` (and adjust
`ASSET_FOLDER`) to also write Earth Engine assets. Every task consumes quota, so keep only the
ones you need — all three targets with both destinations create 24 tasks.

---

## Citation

If you use this script or its products, please cite both the original method and this adaptation.

**Original method**

> Silva Junior, C.H.L., Heinrich, V.H.A., Freire, A.T.G. *et al.* Benchmark maps of 33 years of
> secondary forest age for Brazil. *Scientific Data* **7**, 269 (2020).
> https://doi.org/10.1038/s41597-020-00600-4

**This adaptation**

> Santarosa, L.V. (2026). *Age of Silviculture in Uruguay* — Google Earth Engine script adapted
> from Silva Junior et al. (2020) for MapBiomas Uruguay Collection 3. Laboratorio de Recursos
> Hídricos y Geotecnologías, Escuela de Agronomía, Pontificia Universidad Católica de Valparaíso.
> https://github.com/lvsantarosa/Age-of-Silviculture-Uruguay

**Data**

> MapBiomas Uruguay Project — Collection 3 of annual land cover and land use maps of Uruguay
> (1985–2024), accessed 2026. https://uruguay.mapbiomas.org

---

## References and links

- Paper (original method): https://doi.org/10.1038/s41597-020-00600-4
- Original code: https://github.com/celsohlsj/gee_brazil_sv/blob/master/gee_brazil_sv_toolkit_download.js
- MapBiomas Uruguay: https://uruguay.mapbiomas.org
- MapBiomas Uruguay legend codes: https://uruguay.mapbiomas.org/codigos-de-la-leyenda/
- MapBiomas user toolkit (asset IDs and legends): https://github.com/mapbiomas/user-toolkit
- This script on Earth Engine: https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc

---

## Author

**Lucas Vituri Santarosa**
Laboratorio de Recursos Hídricos y Geotecnologías (LRHG)
Escuela de Agronomía · Facultad de Ciencias Agronómicas y de los Alimentos
Pontificia Universidad Católica de Valparaíso (PUCV)
📧 lucas.vituri@pucv.cl
