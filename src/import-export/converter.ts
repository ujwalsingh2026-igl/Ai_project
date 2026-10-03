export const fileConverter = {
  exportToPlainText(content: string): string {
    return content.replace(/<[^>]*>/g, '');
  },

  exportToMarkdown(title: string, content: string): string {
    const plain = content.replace(/<[^>]*>/g, '');
    return `# ${title}\n\n${plain}`;
  },
};
