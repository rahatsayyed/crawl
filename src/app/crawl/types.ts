export interface ContactData {
  emails: string[];
  phones: string[];
}

export interface PageData {
  url: string;
  text: string;
  emails: string[];
  phones: string[];
}

export interface CrawlResult {
  emails: string;
  phones: string;
  pages: Record<string, string>;
}
