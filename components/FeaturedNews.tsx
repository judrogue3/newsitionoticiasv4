'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';

export default function FeaturedNews() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative h-[70vh] min-h-[600px] w-full overflow-hidden"
    >
      <Image
        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab"
        alt="Featured news"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
      <div className="container relative h-full flex items-end pb-16">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl space-y-4"
        >
          <span className="inline-block bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            Breaking News
          </span>
          <h1 className="headline text-white">
            Global Markets Rally as Tech Sector Leads Economic Recovery
          </h1>
          <p className="subheadline text-gray-200">
            Major technology companies report strong earnings, driving market optimism and economic growth prospects.
          </p>
          <button className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors">
            Read Full Story
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}