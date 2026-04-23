import GridPostList from "@/components/shared/GridPostList";
import SearchResults from "@/components/shared/SearchResults";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import useResponsiveColumns from "@/hooks/useResponsiveColumns";
import {
  useGetPosts,
  useSearchPosts,
} from "@/lib/react-query/queriesAndMutations";
import { Loader } from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT = 340;
const LOAD_MORE_ROOT_MARGIN = "0px 0px 320px 0px";
const COLUMN_RULES = [
  { query: "(min-width: 1280px)", columns: 3 }, // xl
  { query: "(min-width: 1024px)", columns: 2 }, // lg
  { query: "(min-width: 768px)", columns: 1 }, // md
  { query: "(min-width: 640px)", columns: 2 }, // sm
];

const Explore = () => {
  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: LOAD_MORE_ROOT_MARGIN,
  });
  const {
    data: posts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetPosts();
  const [searchValue, setSearchValue] = useState("");
  const columnCount = useResponsiveColumns(COLUMN_RULES, 1);
  const debounceValue = useDebounce(searchValue, 500);
  const { data: searchedPosts, isFetching: isSearchFetching } =
    useSearchPosts(debounceValue);

  const allPosts = posts?.pages.flatMap((page) => page.documents) || [];
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const result: (typeof allPosts)[] = [];
    for (let i = 0; i < allPosts.length; i += columnCount) {
      result.push(allPosts.slice(i, i + columnCount));
    }
    return result;
  }, [allPosts, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 2,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [columnCount, rows.length, rowVirtualizer]);

  useEffect(() => {
    if (inView && !searchValue && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, searchValue, hasNextPage, isFetchingNextPage]);

  if (!posts) {
    return (
      <div className="flex-center w-full h-full ">
        <Loader />
      </div>
    );
  }

  const shouldShowSearchResults = searchValue !== "";
  const shouldShowPosts =
    !shouldShowSearchResults &&
    posts?.pages.every((item) => item.documents.length === 0);

  return (
    <div className="explore-container">
      <div className="explore-inner_container">
        <h2 className="h3-bold md:h2-bold w-full">Search Posts</h2>
        <div className="flex gap-1 px-4 w-full rounded-lg bg-dark-4">
          <img
            src="/assets/icons/search.svg"
            width={24}
            height={24}
            alt="search"
          />
          <Input
            type="text"
            placeholder="Search"
            className="explore-search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-between w-full max-w-5xl mt-16 mb-7">
        <h3 className="body-bold md:h3-bold">Popular Today</h3>

        <div className="flex-center gap-3 bg-dark-3 rounded-xl px-4 py-2 cursor-pointer">
          <p className="small-medium md:base-medium text-light-2">All</p>
          <img
            src="/assets/icons/filter.svg"
            width={20}
            height={20}
            alt="filter"
          />
        </div>
      </div>

      {shouldShowSearchResults ? (
        <SearchResults
          isSearchFetching={isSearchFetching}
          searchedPosts={searchedPosts}
        />
      ) : shouldShowPosts ? (
        <p className="text-light-4 mt-10 text-center w-full ">End of Posts</p>
      ) : (
        <div
          ref={parentRef}
          className="w-full max-w-5xl overflow-x-hidden overflow-y-auto custom-scrollbar"
          style={{ height: "calc(100vh)" }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize() + (hasNextPage ? 100 : 0)}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <GridPostList
                  posts={rows[virtualRow.index]}
                  showUser={true}
                  showStats={true}
                />
              </div>
            ))}
          </div>
          {hasNextPage && !searchValue && (
            <div ref={loadMoreRef} className="flex-center py-4">
              <Loader />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;
