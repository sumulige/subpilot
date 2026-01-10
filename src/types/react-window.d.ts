// Type declarations for react-window v2
declare module 'react-window' {
    import { ComponentType, CSSProperties, Ref } from 'react';

    export interface RowComponentProps {
        index: number;
        style: CSSProperties;
    }

    export interface ListProps {
        height: number;
        width: number | string;
        rowComponent: ComponentType<RowComponentProps>;
        rowCount: number;
        rowHeight: number | ((index: number) => number);
        className?: string;
        style?: CSSProperties;
        initialScrollOffset?: number;
        overscanCount?: number;
    }

    export interface ListHandle {
        scrollTo: (scrollOffset: number) => void;
        scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
    }

    export const List: ComponentType<ListProps & { ref?: Ref<ListHandle> }>;
    export const Grid: ComponentType<any>;
    export function getScrollbarSize(): number;
    export function useListRef(): Ref<ListHandle>;
    export function useDynamicRowHeight(): any;
    export function useGridRef(): any;
    export function useListCallbackRef(): any;
    export function useGridCallbackRef(): any;
}
