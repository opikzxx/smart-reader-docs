import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";



export const metadata: Metadata = {
	title: "Smart Document Reader",
	description: "Smart Document Reader - AI-powered document analysis and reading",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body >
				<SessionProvider>
					<QueryProvider>{children}</QueryProvider>
				</SessionProvider>
			</body>
		</html>
	);
}
