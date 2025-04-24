// src/types/layout.ts
import { ReactNode } from 'react';

export interface NavItemType {
  icon: ReactNode;
  text: string;
  path: string;
  active?: boolean;
}

export interface SidebarSection {
  title: string;
  items: NavItemType[];
}