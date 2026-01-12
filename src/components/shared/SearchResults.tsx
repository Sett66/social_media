import type { Models } from "appwrite";
import { Loader } from "lucide-react";
import React from "react";
import GridPostList from "./GridPostList";

type SearchResultsProps = {
  isSearchFetching: boolean;
  searchedPosts: Models.Document[];
};

const SearchResults = ({
  isSearchFetching,
  searchedPosts,
}: SearchResultsProps) => {
  if (isSearchFetching) return <Loader />;
  else if (searchedPosts && searchedPosts.documents.length > 0) {
    console.log(searchedPosts.documents);
    return <GridPostList posts={searchedPosts.documents} />;
  } else {
    return (
      <p className="text-light-4 mt-10 text-center w-full">No Result Found</p>
    );
  }
};

export default SearchResults;
