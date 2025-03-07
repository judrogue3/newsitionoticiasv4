export default function LatestNews() {
  const latestNews = [
    {
      id: '1',
      title: 'Market Update: Global Stocks Rally on Tech Earnings',
      date: '2 hours ago',
      category: 'Markets',
    },
    {
      id: '2',
      title: 'Central Bank Signals Potential Rate Cut',
      date: '3 hours ago',
      category: 'Economy',
    },
    {
      id: '3',
      title: 'New Regulations Impact Cryptocurrency Trading',
      date: '4 hours ago',
      category: 'Crypto',
    },
    // Add more news items as needed
  ];

  return (
    <div className="bg-muted/50 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Latest News</h2>
      <div className="space-y-4">
        {latestNews.map((news) => (
          <div key={news.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
            <span className="text-xs font-medium text-primary">{news.category}</span>
            <h3 className="text-sm font-medium hover:text-primary cursor-pointer">
              {news.title}
            </h3>
            <span className="text-xs text-muted-foreground">{news.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}