'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Filter } from 'lucide-react';

export interface CatalogFilterState {
  bookType: 'all' | 'sale' | 'swap' | 'free';
  genre: string;
  condition: 'Any Condition' | 'New' | 'Like New' | 'Good' | 'Fair';
  minPrice: string;
  maxPrice: string;
  sortBy: 'popularity' | 'newest' | 'rating' | 'price_asc' | 'price_desc' | 'listed_date_desc' | 'listed_date_asc';
}

interface CatalogFiltersProps {
  onFiltersChange: (filters: CatalogFilterState) => void;
  initialFilters: CatalogFilterState;
  availableGenres: string[];
}

const MAX_SLIDER_PRICE = 200;

export function CatalogFilters({ onFiltersChange, initialFilters, availableGenres }: CatalogFiltersProps) {
  const [currentFilters, setCurrentFilters] = useState<CatalogFilterState>(initialFilters);
  const [sliderPriceRange, setSliderPriceRange] = useState<[number, number]>([0, MAX_SLIDER_PRICE]);

  useEffect(() => {
    setCurrentFilters(initialFilters);
    const min = parseFloat(initialFilters.minPrice);
    const max = parseFloat(initialFilters.maxPrice);

    const visualMin = isNaN(min) || min < 0 ? 0 : (min > MAX_SLIDER_PRICE ? MAX_SLIDER_PRICE : min);
    const visualMax = isNaN(max) || max <= 0 || max < visualMin ? MAX_SLIDER_PRICE : (max > MAX_SLIDER_PRICE ? MAX_SLIDER_PRICE : max);
    setSliderPriceRange([visualMin, visualMax]);
  }, [initialFilters]);

  const handleInputChange = (field: keyof CatalogFilterState, value: string) => {
    setCurrentFilters(prev => ({ ...prev, [field]: value }));
    if (field === 'minPrice' || field === 'maxPrice') {
      const newMin = field === 'minPrice' ? parseFloat(value) : parseFloat(currentFilters.minPrice);
      const newMax = field === 'maxPrice' ? parseFloat(value) : parseFloat(currentFilters.maxPrice);

      const visualMin = isNaN(newMin) || newMin < 0 ? 0 : (newMin > MAX_SLIDER_PRICE ? MAX_SLIDER_PRICE : newMin);
      let visualMax = isNaN(newMax) || newMax <= 0 || newMax < visualMin ? MAX_SLIDER_PRICE : (newMax > MAX_SLIDER_PRICE ? MAX_SLIDER_PRICE : newMax);
      if (visualMin > visualMax && field === 'minPrice') visualMax = visualMin > MAX_SLIDER_PRICE ? MAX_SLIDER_PRICE : visualMin;

      setSliderPriceRange([visualMin, visualMax]);
    }
  };

  const handleSelectChange = (field: keyof CatalogFilterState, value: string) => {
    setCurrentFilters(prev => ({ ...prev, [field]: value as CatalogFilterState[typeof field] }));
  };

  const handlePriceSliderChange = (value: [number, number]) => {
    setSliderPriceRange(value);
    setCurrentFilters(prev => ({
      ...prev,
      minPrice: value[0].toString(),
      maxPrice: value[1] === MAX_SLIDER_PRICE && initialFilters.maxPrice === '' ? '' : value[1].toString(),
    }));
  };

  const applyFilters = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onFiltersChange(currentFilters);
  };

  return (
    <Card className="sticky top-20 shadow-sm border border-border/60">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Filter Books</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bookType">Book Type</Label>
          <Select
            name="bookType"
            value={currentFilters.bookType}
            onValueChange={(value) => handleSelectChange('bookType', value)}
          >
            <SelectTrigger id="bookType">
              <SelectValue placeholder="All Books" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Books</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="swap">Swap</SelectItem>
              <SelectItem value="free">Free</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">Genre</Label>
          <Select
            name="genre"
            value={currentFilters.genre}
            onValueChange={(value) => handleSelectChange('genre', value)}
          >
            <SelectTrigger id="genre">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              {availableGenres.map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select
            name="condition"
            value={currentFilters.condition}
            onValueChange={(value) => handleSelectChange('condition', value)}
          >
            <SelectTrigger id="condition">
              <SelectValue placeholder="Any Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any Condition">Any Condition</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Like New">Like New</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minPrice">Price Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                id="minPrice"
                placeholder="$ Min"
                className="w-1/2"
                value={currentFilters.minPrice}
                onChange={(e) => handleInputChange('minPrice', e.target.value)}
                min="0"
                step="0.01"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                id="maxPrice"
                placeholder="$ Max"
                className="w-1/2"
                value={currentFilters.maxPrice}
                onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                min={currentFilters.minPrice || "0"}
                step="0.01"
              />
            </div>
            <Slider
              value={sliderPriceRange}
              onValueChange={handlePriceSliderChange}
              max={MAX_SLIDER_PRICE}
              step={5}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${sliderPriceRange[0]}</span>
              <span>{sliderPriceRange[1] === MAX_SLIDER_PRICE && currentFilters.maxPrice === '' ? `${MAX_SLIDER_PRICE}+` : `$${sliderPriceRange[1]}`}</span>
            </div>
          </div>

        <div className="space-y-2">
          <Label htmlFor="sortBy">Sort By</Label>
          <Select
            name="sortBy"
            value={currentFilters.sortBy}
            onValueChange={(value) => handleSelectChange('sortBy', value)}
          >
            <SelectTrigger id="sortBy">
              <SelectValue placeholder="Popularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="listed_date_desc">Recently Listed (Used)</SelectItem>
              <SelectItem value="listed_date_asc">Oldest Listed (Used)</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={applyFilters}>
          <Filter className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
      </CardContent>
    </Card>
  );
}