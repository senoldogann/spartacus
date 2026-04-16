import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
    title: "RepoBench",
    description: "Benchmark coding agents on your own repository history",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
