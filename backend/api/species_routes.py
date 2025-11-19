from fastapi import APIRouter, UploadFile, File, Request, Query, BackgroundTasks
from typing import List
from datetime import datetime
from pathlib import Path
import random

router = APIRouter()

MOCK_CLUSTERS = [
    {
        "id": 47,
        "name": "Unknown Cluster #47",
        "cohesion_score": 0.81,
        "size": 18,
        "is_anomaly": True,
        "images": [
            "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=640&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=640&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=640&auto=format&fit=crop",
        ],
    },
    {
        "id": 5,
        "name": "Monarch",
        "cohesion_score": 0.92,
        "size": 102,
        "is_anomaly": False,
        "images": [
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=640&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=640&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=640&auto=format&fit=crop",
        ],
    },
    {
        "id": 12,
        "name": "Blue Morpho",
        "cohesion_score": 0.88,
        "size": 64,
        "is_anomaly": False,
        "images": [
            "https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=640&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=640&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=640&auto=format&fit=crop",
        ],
    },
]

@router.post("/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    return {
        "success": True,
        "data": {"count": len(files)},
        "message": "Uploaded",
        "timestamp": datetime.utcnow().isoformat()
    }

# Simple in-memory cache for clusters to avoid rescanning on every request
_CLUSTERS_CACHE: List[dict] = []
_CACHE_BUILT_AT: datetime | None = None
_CACHE_TTL_SECONDS = 300

def _scan_dataset(request: Request) -> List[dict]:
    # Scan both the primary butterflies dataset and any upserted images
    # Prioritize upserted species so they appear first in the
    # clusters list (and therefore on the first page in the UI).
    roots = [
        Path("/app/data/temp_extract/train"),
        Path("/app/data/butterflies/train"),
    ]
    existing_roots = [r for r in roots if r.exists() and r.is_dir()]
    if not existing_roots:
        print("No dataset directories found; returning empty scan")
        return []

    results: List[dict] = []

    # Define allowed image extensions (case-insensitive)
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
    base_url = str(request.base_url).rstrip('/')

    # Map species name -> list of image Paths aggregated across roots
    from collections import defaultdict
    species_images: dict[str, list[Path]] = defaultdict(list)

    # Debug: Print current working directory and path info
    print(f"Current working directory: {Path.cwd()}")
    for root in existing_roots:
        print(f"Scanning root: {root}")
        try:
            dirs = [d for d in root.iterdir() if d.is_dir()]
            print(f"  Found {len(dirs)} species directories under {root}")
            for d in dirs[:5]:
                print(f"    - {d.name}")
        except Exception as e:
            print(f"Error listing species directories in {root}: {e}")
            continue

        for species_dir in dirs:
            try:
                imgs: list[Path] = []
                try:
                    all_files = list(species_dir.iterdir())
                    imgs = [
                        f for f in all_files
                        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
                    ]
                except Exception as e:
                    print(f"  Error listing images in {species_dir}: {e}")
                    continue

                if not imgs:
                    continue

                species_images[species_dir.name].extend(imgs)

            except Exception as e:
                print(f"  Error processing {species_dir.name} in {root}: {e}")
                import traceback
                traceback.print_exc()
                continue

    if not species_images:
        print("No images found in any dataset roots")
        return []

    print(f"Aggregated {len(species_images)} species across all roots")

    # Process each aggregated species
    for species_name, imgs in species_images.items():
        try:
            print(f"\nProcessing species: {species_name} with {len(imgs)} images")

            # Take up to 5 random images for the cluster
            sample_size = min(5, len(imgs))
            sample_imgs = random.sample(imgs, sample_size) if imgs else []
            
            # Create image URLs
            image_urls = []
            for img in sample_imgs:
                # Decide which static mount to use based on the image path
                img_path_str = str(img)
                if "/app/data/temp_extract/train" in img_path_str:
                    base_path = "uploads"
                else:
                    base_path = "static"

                img_url = f"{base_url}/{base_path}/{species_name}/{img.name}"
                # Debug log
                print(f"  Image URL: {img_url}")
                image_urls.append(img_url)
                
                # Debug: Print the first image URL for verification
                if len(image_urls) == 1:
                    print(f"  First image URL: {img_url}")
                
            # Calculate cohesion score based on number of images
            size = len(imgs)
            cohesion = 0.7 + 0.3 * min(1.0, size / 200.0)
            is_anomaly = size < 10
            
            results.append({
                "id": abs(hash(species_name)) % 10_000_000,
                "name": species_name.replace("_", " "),
                "cohesion_score": round(cohesion, 2),
                "size": size,
                "is_anomaly": is_anomaly,
                "images": image_urls,  # Use the image_urls list we created
            })
            
        except Exception as e:
            print(f"  Error processing {species_dir.name}: {e}")
            import traceback
            traceback.print_exc()
            continue
    return results

def _get_clusters_cached(request: Request) -> List[dict]:
    global _CLUSTERS_CACHE, _CACHE_BUILT_AT

    fresh = False
    if _CACHE_BUILT_AT is not None:
        age = (datetime.utcnow() - _CACHE_BUILT_AT).total_seconds()
        fresh = age < _CACHE_TTL_SECONDS

    if not _CLUSTERS_CACHE or not fresh:
        print("\n=== Starting full dataset scan ===")
        print(f"Current time: {datetime.utcnow().isoformat()}")
        print(f"Request URL: {request.url}")

        try:
            scanned = _scan_dataset(request)
            print(f"SUCCESS: Found {len(scanned)} clusters in dataset")
            _CLUSTERS_CACHE = scanned

            # Print first cluster as sample
            if _CLUSTERS_CACHE:
                print("\nSample cluster:")
                import json
                print(json.dumps(_CLUSTERS_CACHE[0], indent=2, default=str))

        except Exception as e:
            print(f"ERROR in _get_clusters_cached: {e}")
            import traceback
            traceback.print_exc()
            _CLUSTERS_CACHE = []

        _CACHE_BUILT_AT = datetime.utcnow()
        print(f"=== Dataset scan completed at {_CACHE_BUILT_AT} ===\n")
    else:
        print(f"Using {len(_CLUSTERS_CACHE)} cached clusters built at {_CACHE_BUILT_AT}")

    return _CLUSTERS_CACHE

def _quick_scan(request: Request, max_species: int) -> List[dict]:
    # Use the mounted butterflies dataset inside the container
    train_dir = Path("/app/data/butterflies/train")
    results: List[dict] = []
    if not train_dir.exists():
        return []
    exts = ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG")
    base_url = str(request.base_url).rstrip('/')
    count = 0
    for species_dir in sorted([p for p in train_dir.iterdir() if p.is_dir()]):
        imgs: List[Path] = []
        for ext in exts:
            imgs.extend(species_dir.glob(ext))
        if not imgs:
            for sub in [p for p in species_dir.iterdir() if p.is_dir()]:
                for ext in exts:
                    imgs.extend(sub.glob(ext))
                if imgs:
                    break
        if not imgs:
            continue
        thumbs = imgs[:3]
        size = len(imgs)
        cohesion = 0.7 + 0.3 * min(1.0, size / 200.0)
        is_anomaly = size < 10
        images = [f"{base_url}/static/{thumb.parent.name}/{thumb.name}" if thumb.parent == species_dir else f"{base_url}/static/{species_dir.name}/{thumb.name}" for thumb in thumbs]
        results.append({
            "id": abs(hash(species_dir.name)) % 10_000_000,
            "name": species_dir.name.replace("_", " "),
            "cohesion_score": round(cohesion, 2),
            "size": size,
            "is_anomaly": is_anomaly,
            "images": images,
        })
        count += 1
        if count >= max_species:
            break
    return results

def _build_cache_background(request: Request):
    global _CLUSTERS_CACHE, _CACHE_BUILT_AT
    _CLUSTERS_CACHE = _scan_dataset(request)
    _CACHE_BUILT_AT = datetime.utcnow()

@router.get("/clusters")
async def get_clusters(request: Request, background_tasks: BackgroundTasks, page: int = Query(1, ge=1), limit: int = Query(24, ge=1, le=200)):
    global _CLUSTERS_CACHE, _CACHE_BUILT_AT
    # Decide data source without blocking
    data: List[dict] = []
    fresh = False
    if _CACHE_BUILT_AT is not None:
        age = (datetime.utcnow() - _CACHE_BUILT_AT).total_seconds()
        fresh = age < _CACHE_TTL_SECONDS

    if _CLUSTERS_CACHE:
        # Use whatever is cached immediately
        data = _CLUSTERS_CACHE
        # If stale, kick off background refresh but don't block
        if not fresh:
            print("Cache is stale; scheduling background refresh...")
            background_tasks.add_task(_build_cache_background, request)
    else:
        # No cache yet: return a quick, shallow scan immediately
        print("No cache available; serving quick scan and scheduling full build...")
        # Use quick_scan results only; do not fall back to MOCK_CLUSTERS so the
        # UI always reflects real dataset state (possibly empty) instead of
        # demo data.
        data = _quick_scan(request, max_species=limit * max(2, page))
        background_tasks.add_task(_build_cache_background, request)

    # Paginate
    start = (page - 1) * limit
    end = start + limit
    page_items = data[start:end]
    total = len(data)
    print(f"Returning {len(page_items)} items (page {page}, limit {limit}) from {'cache' if _CLUSTERS_CACHE else 'quick'}; total={total}")

    return {
        "success": True,
        "data": page_items,
        "message": "OK",
        "page": page,
        "limit": limit,
        "total": total,
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/embeddings")
async def get_embeddings():
    # Minimal 3D points for a preview
    data = {
        "points": [
            {"id": "img1", "x": 0.1, "y": 0.2, "z": -0.3, "cluster_id": 47},
            {"id": "img2", "x": -0.4, "y": 0.5, "z": 0.1, "cluster_id": 5},
            {"id": "img3", "x": 0.3, "y": -0.1, "z": 0.2, "cluster_id": 12},
        ]
    }
    return {
        "success": True,
        "data": data,
        "message": "OK",
        "timestamp": datetime.utcnow().isoformat(),
    }
