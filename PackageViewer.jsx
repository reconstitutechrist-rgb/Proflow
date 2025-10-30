
import React, { useState, useEffect } from "react";
import { DocumentPackage } from "@/api/entities";
import { Document } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Eye, 
  Download, 
  Trash2,
  Calendar,
  Users,
  FileText,
  Presentation,
  Settings,
  TrendingUp, // Added TrendingUp import
  Shield // Added Shield import
} from "lucide-react";
import PresentationMode from "./PresentationMode";

export default function PackageViewer() {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageDocuments, setPackageDocuments] = useState([]);
  const [showPresentationMode, setShowPresentationMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const packagesData = await DocumentPackage.list("-created_date");
      setPackages(packagesData);
    } catch (error) {
      console.error("Error loading packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPackageDocuments = async (pkg) => {
    try {
      const documentIds = pkg.included_documents.map(doc => doc.document_id);
      const documents = await Promise.all(
        documentIds.map(id => Document.filter({ id }))
      );
      
      // Flatten and sort by order
      const sortedDocs = documents
        .flat()
        .map(doc => {
          const packageDoc = pkg.included_documents.find(pd => pd.document_id === doc.id);
          return { ...doc, order: packageDoc?.order || 0 };
        })
        .sort((a, b) => a.order - b.order);
      
      setPackageDocuments(sortedDocs);
    } catch (error) {
      console.error("Error loading package documents:", error);
      setPackageDocuments([]);
    }
  };

  const handlePackageSelect = async (pkg) => {
    setSelectedPackage(pkg);
    await loadPackageDocuments(pkg);
  };

  const handlePresentPackage = () => {
    if (packageDocuments.length > 0) {
      setShowPresentationMode(true);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPackageTypeIcon = (type) => {
    switch (type) {
      case 'developer': return <FileText className="w-4 h-4" />;
      case 'investor': return <TrendingUp className="w-4 h-4" />;
      case 'partner': return <Users className="w-4 h-4" />;
      case 'client': return <Eye className="w-4 h-4" />;
      case 'compliance': return <Shield className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Package List */}
      <div className="grid gap-4">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className={`border-0 shadow-sm cursor-pointer transition-all ${
              selectedPackage?.id === pkg.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handlePackageSelect(pkg)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getPackageTypeIcon(pkg.package_type)}
                  {pkg.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(pkg.status)}>
                    {pkg.status}
                  </Badge>
                  <Badge variant="outline">
                    {pkg.included_documents?.length || 0} documents
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">{pkg.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(pkg.created_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {pkg.download_count || 0} downloads
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.status === 'ready' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePackageSelect(pkg);
                          setTimeout(() => handlePresentPackage(), 100);
                        }}
                      >
                        <Presentation className="w-4 h-4 mr-1" />
                        Present
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={pkg.package_url} download>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {packages.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No document packages found
              </h3>
              <p className="text-gray-500">
                Create your first document package to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Package Details */}
      {selectedPackage && (
        <Card className="border-0 shadow-sm border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Package Contents: {selectedPackage.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Package Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-blue-800">Type:</span>
                  <p className="text-blue-700 capitalize">{selectedPackage.package_type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-800">Documents:</span>
                  <p className="text-blue-700">{packageDocuments.length} files</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-800">Status:</span>
                  <p className="text-blue-700 capitalize">{selectedPackage.status}</p>
                </div>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Included Documents</h4>
                {packageDocuments.map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.file_name}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{doc.document_type}</Badge>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {selectedPackage.status === 'ready' && packageDocuments.length > 0 && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline"
                    onClick={handlePresentPackage}
                    className="flex items-center gap-2"
                  >
                    <Presentation className="w-4 h-4" />
                    Present Package
                  </Button>
                  <Button 
                    asChild
                    className="flex items-center gap-2"
                  >
                    <a href={selectedPackage.package_url} download>
                      <Download className="w-4 h-4" />
                      Download Package
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Presentation Mode */}
      {showPresentationMode && packageDocuments.length > 0 && (
        <PresentationMode
          documents={packageDocuments}
          initialDocumentIndex={0}
          onClose={() => setShowPresentationMode(false)}
          companyBranding={selectedPackage?.branding}
        />
      )}
    </div>
  );
}
