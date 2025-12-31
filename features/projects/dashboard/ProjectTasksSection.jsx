import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare,
  Circle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-gray-500' },
  { value: 'in_progress', label: 'In Progress', icon: ArrowRight, color: 'text-blue-500' },
  { value: 'review', label: 'Review', icon: Clock, color: 'text-purple-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
];

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'high',
    label: 'High',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
];

export default function ProjectTasksSection({
  tasks,
  assignments,
  onStatusChange,
  onPriorityChange,
}) {
  const getAssignmentName = (assignmentId) => {
    const assignment = assignments?.find((a) => a.id === assignmentId);
    return assignment?.name || null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (task) => {
    if (!task.due_date || task.status === 'completed') return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const StatusIcon = ({ status }) => {
    const config = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-green-600" />
          Tasks
          <Badge variant="secondary" className="ml-1">
            {tasks.length}
          </Badge>
        </h2>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="p-4 text-center">
            <CheckSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[120px]">Due Date</TableHead>
                <TableHead className="w-[140px]">Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const overdue = isOverdue(task);
                const assignmentName = getAssignmentName(task.assignment_id);

                return (
                  <TableRow
                    key={task.id}
                    className={`${task.status === 'completed' ? 'opacity-60 bg-gray-50/50 dark:bg-gray-800/30' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                  >
                    {/* Status Icon */}
                    <TableCell className="py-2">
                      <StatusIcon status={task.status} />
                    </TableCell>

                    {/* Task Title + Assignment */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            task.status === 'completed'
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                        {overdue && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs px-1.5 py-0">
                            <AlertCircle className="w-3 h-3 mr-0.5" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {assignmentName && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                          <CheckSquare className="w-3 h-3" />
                          {assignmentName}
                        </span>
                      )}
                    </TableCell>

                    {/* Status Dropdown */}
                    <TableCell className="py-2">
                      <Select
                        value={task.status || 'todo'}
                        onValueChange={(value) => onStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => {
                            const Icon = status.icon;
                            return (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-3 h-3 ${status.color}`} />
                                  <span>{status.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Priority Dropdown */}
                    <TableCell className="py-2">
                      <Select
                        value={task.priority || 'medium'}
                        onValueChange={(value) => onPriorityChange(task.id, value)}
                      >
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <span className={priority.color}>{priority.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Due Date */}
                    <TableCell className="py-2">
                      {task.due_date ? (
                        <span
                          className={`text-xs flex items-center gap-1 ${
                            overdue
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.due_date)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>

                    {/* Assignee */}
                    <TableCell className="py-2">
                      {task.assigned_to ? (
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_to}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
