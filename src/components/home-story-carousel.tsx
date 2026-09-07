"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export type HomeStory = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
};

const AUTOPLAY_DELAY = 6500;

export function HomeStoryCarousel({ stories }: { stories: HomeStory[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const activeStory = stories[activeIndex] || stories[0];

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () => motionPreference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || stories.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stories.length);
    }, AUTOPLAY_DELAY);
    return () => window.clearInterval(interval);
  }, [paused, reducedMotion, stories.length]);

  if (!activeStory) return null;

  const select = (index: number) => setActiveIndex((index + stories.length) % stories.length);

  return (
    <section
      className="story-carousel"
      aria-roledescription="carrousel"
      aria-label="Actualités à la une"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onFocusCapture={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="story-carousel__slides">
        {stories.map((story, index) => (
          <article
            aria-hidden={index !== activeIndex}
            className={`story-carousel__slide${index === activeIndex ? " is-active" : ""}`}
            key={story.id}
          >
            <Image
              alt={story.imageAlt}
              fill
              loading={index < 2 ? "eager" : "lazy"}
              sizes="100vw"
              src={story.imageUrl}
            />
            <div className="shell story-carousel__content">
              <p>{story.eyebrow}</p>
              <h1>{story.title}</h1>
              <span>{story.summary}</span>
              <a href={story.href} rel={story.href.startsWith("http") ? "noreferrer" : undefined} target={story.href.startsWith("http") ? "_blank" : undefined}>
                Lire <ArrowRight aria-hidden="true" size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="shell story-carousel__controls">
        <div className="story-carousel__arrows">
          <button aria-label="Actualité précédente" onClick={() => select(activeIndex - 1)} type="button"><ArrowLeft size={18} /></button>
          <button aria-label="Actualité suivante" onClick={() => select(activeIndex + 1)} type="button"><ArrowRight size={18} /></button>
        </div>
        <div className="story-carousel__dots" aria-label="Choisir une actualité">
          {stories.map((story, index) => (
            <button aria-label={`Afficher : ${story.title}`} className={index === activeIndex ? "is-active" : ""} key={story.id} onClick={() => select(index)} type="button">
              <span />
            </button>
          ))}
        </div>
        <div className="story-carousel__previews">
          {stories.slice(0, 3).map((story, index) => (
            <button className={index === activeIndex ? "is-active" : ""} key={story.id} onClick={() => select(index)} type="button">
              <Image alt="" height={50} src={story.imageUrl} width={50} />
              <span>{story.title}</span>
            </button>
          ))}
        </div>
      </div>
      {!paused && !reducedMotion && <span className="story-carousel__progress" key={activeIndex} style={{ animationDuration: `${AUTOPLAY_DELAY}ms` }} />}
    </section>
  );
}
