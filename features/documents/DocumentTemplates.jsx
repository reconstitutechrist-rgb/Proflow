import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Briefcase,
  Users,
  Calendar,
  CheckCircle,
  FileSignature,
  Presentation,
  ClipboardList,
  Shield,
  BookOpen,
  Target,
} from 'lucide-react';

export default function DocumentTemplates({ assignment, onTemplateSelect }) {
  const documentTemplates = [
    {
      id: 'project_brief',
      title: 'Assignment Brief',
      description: 'Comprehensive overview of assignment goals, scope, and requirements',
      icon: Briefcase,
      color: 'text-blue-600 bg-blue-50',
      category: 'Planning',
      estimatedTime: '5-10 minutes',
      difficulty: 'Easy',
      sections: [
        'Assignment Overview',
        'Goals & Objectives',
        'Scope',
        'Timeline',
        'Team',
        'Budget',
      ],
    },
    {
      id: 'requirements_document',
      title: 'Requirements Document',
      description: 'Detailed technical and business requirements specification',
      icon: ClipboardList,
      color: 'text-green-600 bg-green-50',
      category: 'Technical',
      estimatedTime: '15-30 minutes',
      difficulty: 'Medium',
      sections: [
        'Functional Requirements',
        'Non-functional Requirements',
        'User Stories',
        'Acceptance Criteria',
      ],
    },
    {
      id: 'project_proposal',
      title: 'Assignment Proposal',
      description: 'Professional proposal for stakeholders or clients',
      icon: Presentation,
      color: 'text-purple-600 bg-purple-50',
      category: 'Business',
      estimatedTime: '20-40 minutes',
      difficulty: 'Medium',
      sections: [
        'Executive Summary',
        'Problem Statement',
        'Proposed Solution',
        'Timeline',
        'Budget',
        'Team',
      ],
    },
    {
      id: 'meeting_minutes',
      title: 'Meeting Minutes Template',
      description: 'Structured template for recording meeting discussions and decisions',
      icon: Users,
      color: 'text-orange-600 bg-orange-50',
      category: 'Communication',
      estimatedTime: '3-5 minutes',
      difficulty: 'Easy',
      sections: ['Attendees', 'Agenda', 'Discussion Points', 'Decisions', 'Action Items'],
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      description: 'Comprehensive analysis of assignment risks and mitigation strategies',
      icon: Shield,
      color: 'text-red-600 bg-red-50',
      category: 'Planning',
      estimatedTime: '15-25 minutes',
      difficulty: 'Medium',
      sections: [
        'Risk Identification',
        'Impact Analysis',
        'Probability Assessment',
        'Mitigation Strategies',
      ],
    },
    {
      id: 'status_report',
      title: 'Status Report',
      description: 'Regular assignment progress and milestone update report',
      icon: Target,
      color: 'text-cyan-600 bg-cyan-50',
      category: 'Communication',
      estimatedTime: '5-15 minutes',
      difficulty: 'Easy',
      sections: ['Progress Summary', 'Completed Tasks', 'Upcoming Milestones', 'Issues & Blockers'],
    },
    {
      id: 'contract_template',
      title: 'Service Agreement',
      description: 'Professional service contract template',
      icon: FileSignature,
      color: 'text-indigo-600 bg-indigo-50',
      category: 'Legal',
      estimatedTime: '30-60 minutes',
      difficulty: 'Advanced',
      sections: ['Parties', 'Scope of Work', 'Terms', 'Payment', 'Deliverables', 'Termination'],
    },
    {
      id: 'user_manual',
      title: 'User Manual',
      description: 'Comprehensive guide for end users',
      icon: BookOpen,
      color: 'text-teal-600 bg-teal-50',
      category: 'Documentation',
      estimatedTime: '45-90 minutes',
      difficulty: 'Advanced',
      sections: [
        'Introduction',
        'Getting Started',
        'Features',
        'Troubleshooting',
        'FAQ',
        'Support',
      ],
    },
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Planning':
        return 'bg-blue-100 text-blue-800';
      case 'Technical':
        return 'bg-green-100 text-green-800';
      case 'Business':
        return 'bg-purple-100 text-purple-800';
      case 'Communication':
        return 'bg-orange-100 text-orange-800';
      case 'Legal':
        return 'bg-red-100 text-red-800';
      case 'Documentation':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <FileText className="w-5 h-5" />
            Document Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700 mb-3">
            Select a template to generate a professional document using your assignment context and
            AI assistance.
          </p>
          {assignment && (
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-green-100 text-green-800">Assignment: {assignment.name}</Badge>
            </div>
          )}
          {!assignment && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-gray-600">
                No assignment selected
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {documentTemplates.map((template) => (
          <Card
            key={template.id}
            className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => onTemplateSelect(template)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${template.color}`}>
                  <template.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                    <Badge className={getCategoryColor(template.category)} variant="secondary">
                      {template.category}
                    </Badge>
                  </div>

                  <p className="text-gray-600 mb-3 text-sm">{template.description}</p>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{template.estimatedTime}</span>
                    </div>
                    <Badge
                      className={getDifficultyColor(template.difficulty)}
                      variant="secondary"
                      size="sm"
                    >
                      {template.difficulty}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Includes sections:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.map((section, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTemplateSelect(template);
                  }}
                >
                  <FileText className="w-3 h-3" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Template Option */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 mb-2">Custom Document</h3>
          <p className="text-gray-600 text-sm mb-4">
            Create a custom document with AI assistance based on your specific requirements
          </p>
          <Button
            variant="outline"
            onClick={() =>
              onTemplateSelect({
                id: 'custom',
                title: 'Custom Document',
                description: 'AI-generated custom document based on your requirements',
              })
            }
          >
            Create Custom Document
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
