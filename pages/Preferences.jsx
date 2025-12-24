import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { db } from '@/api/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  User as UserIcon,
  Bell,
  Mail,
  Eye,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
  Briefcase,
  RefreshCw,
  Link2,
  Github,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GitHubConnectionCard } from '@/features/github';

export default function PreferencesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

  // Handle tab changes and URL sync
  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    job_title: '',
    phone: '',
    bio: '',
    notification_preferences: {
      email_notifications: true,
      task_reminders: true,
      project_updates: true,
      assignment_mentions: true,
      document_shares: true,
    },
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await db.auth.me(); // FIXED: Use db.auth.me()
      setUser(userData);

      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        department: userData.department || '',
        job_title: userData.job_title || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        notification_preferences: {
          // Preserving notification preferences load
          email_notifications: userData.notification_preferences?.email_notifications ?? true,
          task_reminders: userData.notification_preferences?.task_reminders ?? true,
          project_updates: userData.notification_preferences?.project_updates ?? true,
          assignment_mentions: userData.notification_preferences?.assignment_mentions ?? true,
          document_shares: userData.notification_preferences?.document_shares ?? true,
        },
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user preferences'); // Using existing error state for consistency
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
    setError(''); // Clear error on new input
  };

  const handleNotificationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [field]: value,
      },
    }));
    setSaved(false);
    setError(''); // Clear error on new input
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(''); // Clear previous errors
      await db.auth.updateMe(formData); // FIXED: Use db.auth.updateMe()
      setUser({ ...user, ...formData }); // Update local user state
      setSaved(true); // Using existing success state for consistency
      setTimeout(() => setSaved(false), 3000); // Using existing timeout for consistency
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to save preferences. Please try again.'); // Using existing error state for consistency
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Preferences
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Manage your account settings, notifications, and integrations
        </p>
      </div>

      {/* Success/Error Messages */}
      {saved && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your preferences have been saved successfully.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-semibold">
                        {user?.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {user?.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      <Badge className="mt-2 bg-blue-100 text-blue-800">
                        {user?.user_role?.replace('_', ' ') || 'team member'}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Your full name"
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        Contact your administrator to change your name
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your.email@company.com"
                        type="email"
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        Contact your administrator to change your email
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        placeholder="e.g., Engineering, Marketing"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="job_title">Job Title</Label>
                      <Input
                        id="job_title"
                        value={formData.job_title}
                        onChange={(e) => handleInputChange('job_title', e.target.value)}
                        placeholder="e.g., Senior Developer, Product Manager"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        type="tel"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biography</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself, your expertise, and interests..."
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">
                      This will be visible to other team members
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Role</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800">
                      {user?.user_role?.replace('_', ' ') || 'team member'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Member Since</span>
                    <span className="text-sm font-medium">
                      {user?.created_date
                        ? new Date(user.created_date).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Active</span>
                    <span className="text-sm font-medium">
                      {user?.last_active
                        ? new Date(user.last_active).toLocaleDateString()
                        : 'Today'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how and when you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive general email notifications</p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.email_notifications}
                    onCheckedChange={(value) =>
                      handleNotificationChange('email_notifications', value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Task Reminders</Label>
                    <p className="text-sm text-gray-500">
                      Get notified about upcoming task deadlines
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.task_reminders}
                    onCheckedChange={(value) => handleNotificationChange('task_reminders', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Assignment Updates</Label>
                    <p className="text-sm text-gray-500">
                      Receive updates about assignments you're involved in
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.project_updates}
                    onCheckedChange={(value) => handleNotificationChange('project_updates', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Assignment Mentions</Label>
                    <p className="text-sm text-gray-500">
                      Get notified when you're mentioned in discussions
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.assignment_mentions}
                    onCheckedChange={(value) =>
                      handleNotificationChange('assignment_mentions', value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Document Shares</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications when documents are shared with you
                    </p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences.document_shares}
                    onCheckedChange={(value) => handleNotificationChange('document_shares', value)}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Connected Services
                </CardTitle>
                <CardDescription>
                  Connect external services to enhance your Proflow experience
                </CardDescription>
              </CardHeader>
            </Card>

            {/* GitHub Integration */}
            <GitHubConnectionCard />

            {/* Future integrations placeholder */}
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  More Integrations Coming Soon
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  We're working on adding more integrations including Slack, Jira, and more. Stay
                  tuned!
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
