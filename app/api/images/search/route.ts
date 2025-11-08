// app/api/images/search/route.ts
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const num = searchParams.get("num") || "5"; // Number of results (1-10)

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
      console.error("[image-search] Missing API credentials");
      return NextResponse.json(
        { error: "Image search is not configured. Please add API credentials." },
        { status: 500 }
      );
    }

    // Build Google Custom Search API URL with MAXIMUM QUALITY settings
    const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
    searchUrl.searchParams.append("key", GOOGLE_API_KEY);
    searchUrl.searchParams.append("cx", SEARCH_ENGINE_ID);
    searchUrl.searchParams.append("q", query);
    searchUrl.searchParams.append("searchType", "image");
    searchUrl.searchParams.append("num", num);
    searchUrl.searchParams.append("safe", "active"); // Safe search
    searchUrl.searchParams.append("imgSize", "huge"); // CHANGED: Use "huge" for maximum resolution (2MP+)
    searchUrl.searchParams.append("imgType", "photo"); // Prefer high-quality photos
    searchUrl.searchParams.append("fileType", "jpg,png"); // High quality formats only
    searchUrl.searchParams.append("rights", "cc_publicdomain,cc_attribute,cc_sharealike"); // Educational use
    searchUrl.searchParams.append("imgColorType", "color"); // Color images for better engagement

    console.log("[image-search] Fetching MAXIMUM QUALITY (HUGE) images for query:", query);

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[image-search] API error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to fetch images" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image URLs and metadata with ENHANCED quality filtering
    const images = data.items?.map((item: any) => ({
      url: item.link,
      thumbnail: item.image?.thumbnailLink,
      title: item.title,
      context: item.snippet,
      source: item.displayLink,
      width: item.image?.width || 0,
      height: item.image?.height || 0,
    })) || [];

    // AGGRESSIVE QUALITY FILTERING: Only return HD+ images (minimum 1200x900)
    const highResImages = images.filter((img: any) => {
      const minWidth = 1200;
      const minHeight = 900;
      const isHighRes = img.width >= minWidth && img.height >= minHeight;
      
      if (!isHighRes) {
        console.log(`[image-search] Filtering out low-res image: ${img.width}x${img.height} - ${img.title.slice(0, 40)}`);
      }
      
      return isHighRes;
    });

    console.log(`[image-search] Found ${images.length} total images, ${highResImages.length} are HD+ quality (1200x900+)`);

    return NextResponse.json({
      success: true,
      query,
      images: highResImages.length > 0 ? highResImages : images, // Fallback to all if no HD images
      total: data.searchInformation?.totalResults || 0,
      qualityFiltered: highResImages.length > 0,
    });
  } catch (error) {
    console.error("[image-search] Error:", error);
    return NextResponse.json(
      { error: "Failed to search for images" },
      { status: 500 }
    );
  }
}
