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

    // Build Google Custom Search API URL
    const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
    searchUrl.searchParams.append("key", GOOGLE_API_KEY);
    searchUrl.searchParams.append("cx", SEARCH_ENGINE_ID);
    searchUrl.searchParams.append("q", query);
    searchUrl.searchParams.append("searchType", "image");
    searchUrl.searchParams.append("num", num);
    searchUrl.searchParams.append("safe", "active"); // Safe search
    searchUrl.searchParams.append("imgSize", "medium");

    console.log("[image-search] Fetching images for query:", query);

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

    // Extract image URLs and metadata
    const images = data.items?.map((item: any) => ({
      url: item.link,
      thumbnail: item.image?.thumbnailLink,
      title: item.title,
      context: item.snippet,
      source: item.displayLink,
      width: item.image?.width,
      height: item.image?.height,
    })) || [];

    console.log(`[image-search] Found ${images.length} images`);

    return NextResponse.json({
      success: true,
      query,
      images,
      total: data.searchInformation?.totalResults || 0,
    });
  } catch (error) {
    console.error("[image-search] Error:", error);
    return NextResponse.json(
      { error: "Failed to search for images" },
      { status: 500 }
    );
  }
}
