# Age of Silviculture in Uruguay

> Google Earth Engine script to map the **annual increment, extent, loss and age** of silviculture (forest plantations) in Uruguay, from the MapBiomas Pampa land-use classification.

[![Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-JavaScript-4285F4?logo=googleearthengine&logoColor=white)](https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc)
[![Data](https://img.shields.io/badge/data-MapBiomas%20Pampa%20Collection%202-2E8B57)](https://pampa.mapbiomas.org)
[![Period](https://img.shields.io/badge/period-2001--2021-lightgrey)]()
[![Resolution](https://img.shields.io/badge/resolution-30%20m-lightgrey)]()
[![Adapted from](https://img.shields.io/badge/adapted%20from-Silva%20Junior%20et%20al.%202020-orange)](https://doi.org/10.1038/s41597-020-00600-4)

---

## Overview

Forest plantations (mainly *Eucalyptus* and *Pinus*) have expanded rapidly across the Uruguayan
Pampa. Knowing **where** plantations are is only part of the picture — management, carbon stocks
and harvest cycles all depend on **how old** each stand is.

This repository adapts the Brazilian secondary-vegetation toolkit of
[Silva Junior et al. (2020)](https://doi.org/10.1038/s41597-020-00600-4) to the silviculture class
of [MapBiomas Pampa](https://pampa.mapbiomas.org) (Collection 2.0), producing a pixel-level
(30 m) annual history of silviculture in Uruguay for **2001–2021**.

| Product | What it answers |
| --- | --- |
| **Increment** | In which year did silviculture first appear on this pixel? |
| **Extent** | Is this pixel part of a plantation tracked since its establishment? |
| **Loss** | In which year was the plantation harvested / converted? |
| **Age** | How many years has the plantation stood on this pixel? |

---

## Data sources

| Dataset | Use | Asset |
| --- | --- | --- |
| MapBiomas Pampa, Collection 2.0 | Annual land-use/land-cover classification (silviculture = class **9**) | `projects/MapBiomas_Pampa/public/collection2/mapbiomas_pampa_collection2_integration_v1` |
| JRC Global Surface Water v1.3 | Water mask (`max_extent`) to exclude permanent/seasonal water | `JRC/GSW1_3/GlobalSurfaceWater` |
| Uruguay boundary | Area of interest | `projects/ee-lucassantarosa2/assets/UY` (user asset) |

> **Note.** The boundary is a private Earth Engine asset. Replace `UY` with your own country
> polygon (e.g. `FAO/GAUL/2015/level0` filtered to Uruguay) if you do not have access to it.

---

## How it works

The script follows four steps, mirroring the original toolkit:

```
MapBiomas annual classification (2001–2021)
        │
  ┌─────┴───────────────────────────────────┐
  │ Step 1 — Reclassify                     │  silviculture (9) → 1
  │          + anthropic mask + water mask  │  natural/water pixels removed
  └─────┬───────────────────────────────────┘
        │
  ┌─────┴───────────────┐
  │ Step 2 — Increment  │  pixel = 0 in year t-1 and 1 in year t
  └─────┬───────────────┘
        │
  ┌─────┴───────────────┐
  │ Step 3 — Extent     │  cumulative plantation area, still silviculture today
  │       3.1 — Loss    │  tracked pixel that is no longer silviculture
  └─────┬───────────────┘
        │
  ┌─────┴───────────────┐
  │ Step 4 — Age        │  years accumulated since establishment
  └─────────────────────┘
```

**Step 1 — Reclassification and masks.** Each annual band is reduced to a binary silviculture
layer. An *anthropic mask* (classes 1, 2, 3, 4, 10, 11, 12, 14, 22, 26, 27, 33) keeps only
plantations that replaced already-converted or non-forest cover, and the JRC water mask removes
water bodies.

**Step 2 — Annual increment.** A pixel is counted as new silviculture in year *t* when it was not
silviculture in *t-1* and is silviculture in *t*.

**Step 3 — Annual extent and loss.** Increments are accumulated through time and intersected with
the current-year silviculture map. Pixels that drop out of the silviculture class are recorded as
loss in the year they disappear.

**Step 4 — Age.** For every year, the extent layer is added to the previous accumulated age, so
each pixel carries the number of consecutive years it has been under silviculture. The band
`classification_2021` therefore holds the plantation age (in years) at the end of the series.

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
2. Make sure you have access to the MapBiomas Pampa asset and to a Uruguay boundary asset
   (edit the `UY` variable if needed).
3. Click **Run** to inspect the age layer on the map.
4. Open the **Tasks** tab to launch the exports you want.

### Outputs

Each export is a multi-band 30 m raster with one band per year (`classification_2002` …
`classification_2021`):

| Export description | Image | Band values |
| --- | --- | --- |
| `Silviculture_increment` | `sforest_all` | 1 = new plantation in that year |
| `Silviculture_extent` | `sforest_ext` | 1 = plantation present and tracked |
| `Silviculture_loss` | `sforest_loss` | 1 = plantation lost in that year |
| `Silviculture_age` | `sforest_age` | age in years (1–20) |

The script writes each product both to **Google Drive** (`Export.image.toDrive`) and to an
**Earth Engine asset** (`Export.image.toAsset`). Comment out whichever block you do not need —
every task consumes quota.

### Adapting it

| To change | Edit |
| --- | --- |
| Time span | the `2000+i` / `2001+i` offsets and the loop bounds (`i<22`, `i<20`) |
| Target class | `.eq(9)` in Step 1 (9 = silviculture in the MapBiomas legend) |
| Study area | the `UY` FeatureCollection |
| Export resolution | `scale: 30` in the `Export.*` calls |

---

## Citation

If you use this script or its products, please cite both the original method and this adaptation.

**Original method**

> Silva Junior, C.H.L., Heinrich, V.H.A., Freire, A.T.G. *et al.* Benchmark maps of 33 years of
> secondary forest age for Brazil. *Scientific Data* **7**, 269 (2020).
> https://doi.org/10.1038/s41597-020-00600-4

**This adaptation**

> Santarosa, L.V. *Age of Silviculture in Uruguay* — Google Earth Engine script adapted from
> Silva Junior et al. (2020) for MapBiomas Pampa Collection 2.0.
> https://github.com/lvsantarosa/Age-of-Silviculture-Uruguay

**Data**

> MapBiomas Pampa Project — Collection 2.0 of annual land cover and land use maps of the Pampa.
> https://pampa.mapbiomas.org

---

## References and links

- Paper (original method): https://doi.org/10.1038/s41597-020-00600-4
- Original code: https://github.com/celsohlsj/gee_brazil_sv/blob/master/gee_brazil_sv_toolkit_download.js
- MapBiomas Pampa: https://pampa.mapbiomas.org
- This script on Earth Engine: https://code.earthengine.google.com/567f6bbb95866fc07c587849858767dc

---

## Author

**Lucas Vituri Santarosa** — São Paulo State University (UNESP)
📧 lucas.santarosa@unesp.br
