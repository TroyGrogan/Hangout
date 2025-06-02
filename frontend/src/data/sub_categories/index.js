// This file exports all subcategory JSON files for easy importing

import relationships from './1_relationships.json';
import community from './2_community.json';
import financial from './3_financial.json';
import career from './4_career.json';
import time from './5_time.json';
import pets from './6_pets.json';
import health from './7_health.json';
import sports from './8_sports.json';
import technology from './9_technology.json';
import personal from './10_personal.json';
import spirituality from './11_spirituality.json';
import recreation from './12_recreation.json';
import home from './13_home.json';
import travel from './14_travel.json';
import food from './15_food.json';
import art from './16_art.json';

export {
  relationships,
  community,
  financial,
  career,
  time,
  pets,
  health,
  sports,
  technology,
  personal,
  spirituality,
  recreation,
  home,
  travel,
  food,
  art
};

// Map ID to category file
export const categoryFileMap = {
  79: relationships,
  80: community,
  81: financial,
  82: career,
  83: time,
  84: pets,
  85: health,
  86: sports,
  87: technology,
  88: personal,
  89: spirituality,
  90: recreation,
  91: home,
  92: travel,
  93: food,
  94: art
};

// Get a category by ID
export const getCategoryById = (id) => categoryFileMap[id] || null; 