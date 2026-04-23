import { useEffect, useState } from "react";

type ColumnRule = {
  query: string;
  columns: number;
};

const DEFAULT_COLUMNS = 1;

const getColumnsByRules = (rules: ColumnRule[], fallback: number) => {
  for (const rule of rules) {
    if (window.matchMedia(rule.query).matches) {
      return rule.columns;
    }
  }

  return fallback;
};

const useResponsiveColumns = (
  rules: ColumnRule[],
  fallback = DEFAULT_COLUMNS,
) => {
  const [columns, setColumns] = useState<number>(() =>
    getColumnsByRules(rules, fallback),
  );

  useEffect(() => {
    const mediaQueries = rules.map((rule) => window.matchMedia(rule.query));

    const handleChange = () => {
      setColumns(getColumnsByRules(rules, fallback));
    };

    mediaQueries.forEach((mq) => mq.addEventListener("change", handleChange));
    handleChange();

    return () => {
      mediaQueries.forEach((mq) =>
        mq.removeEventListener("change", handleChange),
      );
    };
  }, [rules, fallback]);

  return columns;
};

export default useResponsiveColumns;
