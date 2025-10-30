
import React, { useState, useEffect } from "react";
import { Document } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  Clock,
  Target,
  Zap,
  RefreshCw
} from "lucide-react";

export default function QualityControlDashboard() {
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qualityStats, setQualityStats] = useState(null);

  // Moved calculateQualityStats definition before its usage in loadQualityData
  const calculateQualityStats = (docs, assignments) => {
    const totalDocs = docs.length;
    const analyzedDocs = docs.filter(doc => 
      doc.ai_analysis?.analysis_status === 'completed'
    ).length;
    
    const highQualityDocs = docs.filter(doc => 
      doc.ai_analysis?.completeness_score >= 80
    ).length;
    
    const docsWithConflicts = docs.filter(doc => 
      doc.ai_analysis?.conflicts?.length > 0
    ).length;
    
    const docsWithGaps = docs.filter(doc => 
      doc.ai_analysis?.potential_gaps?.length > 0
    ).length;

    const analysisRate = totalDocs > 0 ? Math.round((analyzedDocs / totalDocs) * 100) : 0;
    const qualityRate = totalDocs > 0 ? Math.round((highQualityDocs / totalDocs) * 100) : 0;

    setQualityStats({
      totalDocuments: totalDocs,
      analyzedDocuments: analyzedDocs,
      highQualityDocuments: highQualityDocs,
      documentsWithConflicts: docsWithConflicts,
      documentsWithGaps: docsWithGaps,
      analysisCompletionRate: analysisRate,
      qualityScore: qualityRate
    });
  };

  const loadQualityData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [docsData, assignmentsData] = await Promise.all([
        Document.list("-created_date"),
        Assignment.list("-updated_date")
      ]);
      
      setDocuments(docsData);
      setAssignments(assignmentsData);
      calculateQualityStats(docsData, assignmentsData);
    } catch (error) {
      console.error("Error loading quality data:", error);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array as calculateQualityStats is now defined outside and is stable

  useEffect(() => {
    loadQualityData();
  }, [loadQualityData]); // Now correctly depends on loadQualityData

  const getQualityColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConflictSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return "bg-red-100 text-red-800";
      case 'medium': return "bg-yellow-100 text-yellow-800";
      case 'low': return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            Quality Control Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Monitor document quality and identify potential issues</p>
        </div>
        <Button onClick={loadQualityData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Quality Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {qualityStats?.analysisCompletionRate || 0}%
            </div>
            <p className="text-sm text-gray-600 mt-1">Analysis Complete</p>
            <div className="mt-3">
              <Progress value={qualityStats?.analysisCompletionRate || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {qualityStats?.qualityScore || 0}%
            </div>
            <p className="text-sm text-gray-600 mt-1">High Quality</p>
            <div className="mt-3">
              <Progress value={qualityStats?.qualityScore || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-red-500">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600">
              {qualityStats?.documentsWithConflicts || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">With Conflicts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-yellow-500">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {qualityStats?.documentsWithGaps || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Missing Info</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Quality Analysis */}
      <Tabs defaultValue="conflicts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="conflicts">Document Conflicts</TabsTrigger>
          <TabsTrigger value="gaps">Information Gaps</TabsTrigger>
          <TabsTrigger value="scores">Quality Scores</TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Document Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.filter(doc => doc.ai_analysis?.conflicts?.length > 0).map((doc) => (
                  <div key={doc.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{doc.title}</h4>
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        {doc.ai_analysis.conflicts.length} conflicts
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {doc.ai_analysis.conflicts.map((conflict, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{conflict.description}</p>
                            <p className="text-xs text-gray-600 mt-1">{conflict.details}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={getConflictSeverityColor(conflict.severity)}>
                                {conflict.severity} severity
                              </Badge>
                              <span className="text-xs text-gray-500">
                                vs. {conflict.conflicting_document_title}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {documents.filter(doc => doc.ai_analysis?.conflicts?.length > 0).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No conflicts found</p>
                    <p>All documents appear to be consistent with each other</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-600" />
                Information Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.filter(doc => doc.ai_analysis?.potential_gaps?.length > 0).map((doc) => (
                  <div key={doc.id} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{doc.title}</h4>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        {doc.ai_analysis.potential_gaps.length} gaps
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {doc.ai_analysis.potential_gaps.map((gap, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                          <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{gap}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {documents.filter(doc => doc.ai_analysis?.potential_gaps?.length > 0).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No gaps identified</p>
                    <p>All documents appear to have comprehensive information</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Quality Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.filter(doc => doc.ai_analysis?.completeness_score != null).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <FileText className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                      <p className="text-sm text-gray-600 truncate">{doc.file_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold px-3 py-1 rounded-full ${
                          getQualityColor(doc.ai_analysis.completeness_score)
                        }`}>
                          {doc.ai_analysis.completeness_score}%
                        </div>
                      </div>
                      <div className="w-24">
                        <Progress 
                          value={doc.ai_analysis.completeness_score} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {documents.filter(doc => doc.ai_analysis?.completeness_score != null).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No quality scores available</p>
                    <p>Upload and analyze documents to see quality metrics</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
