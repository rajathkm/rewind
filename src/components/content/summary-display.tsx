"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Lightbulb,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Quote,
  ArrowRight,
  HelpCircle,
  Zap,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryOutput } from "@/lib/summarization/schema";

interface SummaryDisplayProps {
  summary: SummaryOutput;
  contentType?: "article" | "podcast" | "newsletter";
  className?: string;
}

export function SummaryDisplay({
  summary,
  contentType = "article",
  className,
}: SummaryDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["takeaways"])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "extension":
        return <ArrowRight className="w-3 h-3" />;
      case "counterpoint":
        return <MessageSquare className="w-3 h-3" />;
      case "application":
        return <Zap className="w-3 h-3" />;
      case "question":
        return <HelpCircle className="w-3 h-3" />;
      default:
        return <Lightbulb className="w-3 h-3" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Headline & TLDR */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-2">{summary.headline}</h2>
              <p className="text-muted-foreground">{summary.tldr}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      {summary.keyTakeaways.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => toggleSection("takeaways")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Key Takeaways
                <Badge variant="secondary" className="ml-2">
                  {summary.keyTakeaways.length}
                </Badge>
              </CardTitle>
              {expandedSections.has("takeaways") ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSections.has("takeaways") && (
            <CardContent className="pt-0 space-y-4">
              {summary.keyTakeaways.map((takeaway, index) => (
                <div
                  key={index}
                  className="border-l-2 border-yellow-500/50 pl-4 py-1"
                >
                  <p className="font-medium mb-1">{takeaway.takeaway}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {takeaway.context}
                  </p>
                  {takeaway.actionable && (
                    <div className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 p-2 rounded">
                      <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{takeaway.actionable}</span>
                    </div>
                  )}
                  {takeaway.sourceQuote && (
                    <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground italic">
                      <Quote className="w-4 h-4 flex-shrink-0" />
                      <span>"{takeaway.sourceQuote}"</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"
                      title={`Confidence: ${Math.round(takeaway.confidence * 100)}%`}
                    >
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${takeaway.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(takeaway.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Full Summary */}
      <Card>
        <CardHeader
          className="cursor-pointer py-3"
          onClick={() => toggleSection("summary")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-blue-500" />
              Full Summary
            </CardTitle>
            {expandedSections.has("summary") ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has("summary") && (
          <CardContent className="pt-0">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {summary.fullSummary.split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {summary.keyPoints.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2 text-sm">Key Points</h4>
                <ul className="space-y-1">
                  {summary.keyPoints.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Related Ideas */}
      {summary.relatedIdeas.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => toggleSection("ideas")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-4 h-4 text-purple-500" />
                Related Ideas
                <Badge variant="secondary" className="ml-2">
                  {summary.relatedIdeas.length}
                </Badge>
              </CardTitle>
              {expandedSections.has("ideas") ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSections.has("ideas") && (
            <CardContent className="pt-0 space-y-3">
              {summary.relatedIdeas.map((idea, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div
                    className={cn(
                      "p-1.5 rounded",
                      idea.category === "extension" && "bg-blue-100 dark:bg-blue-950",
                      idea.category === "counterpoint" && "bg-orange-100 dark:bg-orange-950",
                      idea.category === "application" && "bg-green-100 dark:bg-green-950",
                      idea.category === "question" && "bg-purple-100 dark:bg-purple-950"
                    )}
                  >
                    {getCategoryIcon(idea.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{idea.idea}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {idea.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {idea.connection}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Allied Trivia */}
      {summary.alliedTrivia.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => toggleSection("trivia")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4 text-cyan-500" />
                Did You Know?
                <Badge variant="secondary" className="ml-2">
                  {summary.alliedTrivia.length}
                </Badge>
              </CardTitle>
              {expandedSections.has("trivia") ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSections.has("trivia") && (
            <CardContent className="pt-0 space-y-3">
              {summary.alliedTrivia.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30"
                >
                  <p className="font-medium text-sm mb-1">{item.fact}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.relevance}
                  </p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Podcast-specific: Speakers */}
      {contentType === "podcast" && summary.speakers && summary.speakers.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => toggleSection("speakers")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Speakers
              </CardTitle>
              {expandedSections.has("speakers") ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSections.has("speakers") && (
            <CardContent className="pt-0 space-y-3">
              {summary.speakers.map((speaker, index) => (
                <div key={index} className="border-l-2 border-indigo-500/50 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{speaker.name}</span>
                    {speaker.role && (
                      <Badge variant="secondary" className="text-xs">
                        {speaker.role}
                      </Badge>
                    )}
                  </div>
                  {speaker.keyContributions.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {speaker.keyContributions.map((contribution, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-500">•</span>
                          {contribution}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
