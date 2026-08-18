import z from "@deepseek-ai/schemastery";
export declare const CustomPaletteSchema: z<Schemastery.ObjectS<{
    id: z<string, string>;
    name: z<string, string>;
    light: z<Schemastery.ObjectS<{
        [k: string]: z<string, string>;
    }>, Schemastery.ObjectT<{
        [k: string]: z<string, string>;
    }>>;
    dark: z<Schemastery.ObjectS<{
        [k: string]: z<string, string>;
    }>, Schemastery.ObjectT<{
        [k: string]: z<string, string>;
    }>>;
}>, Schemastery.ObjectT<{
    id: z<string, string>;
    name: z<string, string>;
    light: z<Schemastery.ObjectS<{
        [k: string]: z<string, string>;
    }>, Schemastery.ObjectT<{
        [k: string]: z<string, string>;
    }>>;
    dark: z<Schemastery.ObjectS<{
        [k: string]: z<string, string>;
    }>, Schemastery.ObjectT<{
        [k: string]: z<string, string>;
    }>>;
}>>;
export declare const SettingsSchema: z<Schemastery.ObjectS<{
    colorsEnabled: z<boolean, boolean>;
    activePreset: z<string, string>;
    customPalettes: z<({
        id?: string | null;
        name?: string | null;
        light?: ({
            [x: string]: string | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null;
        dark?: ({
            [x: string]: string | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<{
        id: z<string, string>;
        name: z<string, string>;
        light: z<Schemastery.ObjectS<{
            [k: string]: z<string, string>;
        }>, Schemastery.ObjectT<{
            [k: string]: z<string, string>;
        }>>;
        dark: z<Schemastery.ObjectS<{
            [k: string]: z<string, string>;
        }>, Schemastery.ObjectT<{
            [k: string]: z<string, string>;
        }>>;
    }>[]>;
}>, Schemastery.ObjectT<{
    colorsEnabled: z<boolean, boolean>;
    activePreset: z<string, string>;
    customPalettes: z<({
        id?: string | null;
        name?: string | null;
        light?: ({
            [x: string]: string | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null;
        dark?: ({
            [x: string]: string | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<{
        id: z<string, string>;
        name: z<string, string>;
        light: z<Schemastery.ObjectS<{
            [k: string]: z<string, string>;
        }>, Schemastery.ObjectT<{
            [k: string]: z<string, string>;
        }>>;
        dark: z<Schemastery.ObjectS<{
            [k: string]: z<string, string>;
        }>, Schemastery.ObjectT<{
            [k: string]: z<string, string>;
        }>>;
    }>[]>;
}>>;
export declare const Config: z<Schemastery.ObjectS<{
    defaultPreset: z<"native" | "github-markdown" | "catppuccin-mocha" | "dracula" | "nord" | "tokyo-night" | "gruvbox", "native" | "github-markdown" | "catppuccin-mocha" | "dracula" | "nord" | "tokyo-night" | "gruvbox">;
}>, Schemastery.ObjectT<{
    defaultPreset: z<"native" | "github-markdown" | "catppuccin-mocha" | "dracula" | "nord" | "tokyo-night" | "gruvbox", "native" | "github-markdown" | "catppuccin-mocha" | "dracula" | "nord" | "tokyo-night" | "gruvbox">;
}>>;
export declare function validateResolvedSettings(value: unknown): void;
