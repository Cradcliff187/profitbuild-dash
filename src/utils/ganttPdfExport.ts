import jsPDF from 'jspdf';
import { ScheduleTask } from '@/types/schedule';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

interface GanttPdfExportOptions {
  tasks: ScheduleTask[];
  projectName: string;
  projectNumber?: string;
  clientName?: string;
  ganttContainer: HTMLElement;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  includeProjectHeader?: boolean;
  includeTaskDetails?: boolean;
  previewOnly?: boolean;
}

// Category colors matching the UI
const CATEGORY_COLORS: { [key: string]: string } = {
  'Site Work': '#8B4513',
  'Foundation': '#696969',
  'Framing': '#DAA520',
  'Exterior': '#4682B4',
  'Roofing': '#DC143C',
  'Windows & Doors': '#20B2AA',
  'Plumbing': '#1E90FF',
  'Electrical': '#FFD700',
  'HVAC': '#FF8C00',
  'Insulation': '#FFA07A',
  'Drywall': '#D3D3D3',
  'Interior Finishes': '#9370DB',
  'Flooring': '#8B7355',
  'Painting': '#87CEEB',
  'Cabinets & Countertops': '#CD853F',
  'Fixtures & Appliances': '#A9A9A9',
  'Landscaping': '#32CD32',
  'Final Inspection': '#FF69B4',
  'Other': '#808080'
};

/**
 * Filter tasks by date range
 * Includes tasks that overlap with the date range
 */
function filterTasksByDateRange(
  tasks: ScheduleTask[],
  dateRange: { start: Date | null; end: Date | null }
): ScheduleTask[] {
  if (!dateRange.start || !dateRange.end) {
    return tasks;
  }

  return tasks.filter(task => {
    const taskStart = new Date(task.start);
    const taskEnd = new Date(task.end);
    const rangeStart = dateRange.start!;
    const rangeEnd = dateRange.end!;

    // Task overlaps if: task starts before range ends AND task ends after range starts
    return taskStart <= rangeEnd && taskEnd >= rangeStart;
  });
}

/**
 * Helper function to extract notes from schedule_notes
 */
const extractNotes = (task: ScheduleTask): { taskNotes?: string; phaseNotes?: Array<{ phase: number; notes: string }> } => {
  if (!task.schedule_notes) {
    return {};
  }
  
  try {
    const parsed = JSON.parse(task.schedule_notes);
    const result: { taskNotes?: string; phaseNotes?: Array<{ phase: number; notes: string }> } = {};
    
    // Extract task-level notes
    if (typeof parsed.notes === 'string' && parsed.notes.trim()) {
      result.taskNotes = parsed.notes.trim();
    }
    
    // Extract phase notes
    if (parsed.phases && Array.isArray(parsed.phases)) {
      const phaseNotes = parsed.phases
        .filter((phase: any) => phase.notes && typeof phase.notes === 'string' && phase.notes.trim())
        .map((phase: any) => ({
          phase: phase.phase_number || 0,
          notes: phase.notes.trim()
        }));
      
      if (phaseNotes.length > 0) {
        result.phaseNotes = phaseNotes;
      }
    }
    
    return result;
  } catch (e) {
    // Not JSON - treat as plain text notes
    const trimmed = task.schedule_notes.trim();
    if (trimmed) {
      return { taskNotes: trimmed };
    }
    return {};
  }
};


/**
 * Calculate timeline bounds from tasks
 */
function calculateTimelineBounds(tasks: ScheduleTask[]): { minDate: Date; maxDate: Date; totalDays: number } {
  if (tasks.length === 0) {
    throw new Error('No tasks to calculate timeline bounds');
  }

  const dates = tasks.flatMap(task => [new Date(task.start), new Date(task.end)]);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Add padding
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  
  const totalDays = differenceInDays(maxDate, minDate);
  
  return { minDate, maxDate, totalDays };
}

/**
 * Draw Gantt chart on canvas from scratch
 */
function drawGanttChart(
  canvas: HTMLCanvasElement,
  tasks: ScheduleTask[],
  projectName: string,
  projectNumber?: string,
  clientName?: string,
  dateRange?: { start: Date | null; end: Date | null },
  includeHeader: boolean = true
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Configuration
  const TASK_NAME_WIDTH = 300;
  const ROW_HEIGHT = 35;
  const HEADER_HEIGHT = includeHeader ? 120 : 60;
  const TIMELINE_HEIGHT = 40;
  const PADDING = 20;
  const BAR_HEIGHT = 20;
  
  // Calculate timeline
  const { minDate, maxDate, totalDays } = calculateTimelineBounds(tasks);
  const timelineWidth = Math.max(800, totalDays * 8); // At least 8px per day
  
  // Set canvas dimensions
  canvas.width = TASK_NAME_WIDTH + timelineWidth + PADDING * 2;
  canvas.height = HEADER_HEIGHT + TIMELINE_HEIGHT + (tasks.length * ROW_HEIGHT) + PADDING * 2;
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  let yOffset = PADDING;
  
  // Draw project header if requested
  if (includeHeader) {
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(projectName, PADDING, yOffset + 20);
    
    yOffset += 30;
    
    if (projectNumber || clientName) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      if (projectNumber) {
        ctx.fillText(`Project: ${projectNumber}`, PADDING, yOffset + 12);
        yOffset += 20;
      }
      if (clientName) {
        ctx.fillText(`Client: ${clientName}`, PADDING, yOffset + 12);
        yOffset += 20;
      }
    }
    
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Arial';
    ctx.fillText(`Export Date: ${format(new Date(), 'MMMM d, yyyy')}`, PADDING, yOffset + 12);
    if (dateRange?.start && dateRange?.end) {
      ctx.fillText(
        ` | Period: ${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
        PADDING + 200,
        yOffset + 12
      );
    }
    
    yOffset += 30;
    
    // Header separator line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING, yOffset);
    ctx.lineTo(canvas.width - PADDING, yOffset);
    ctx.stroke();
    
    yOffset += 10;
  }
  
  // Draw timeline header
  const timelineY = yOffset;
  yOffset += TIMELINE_HEIGHT;
  
  // Timeline background
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(PADDING + TASK_NAME_WIDTH, timelineY, timelineWidth, TIMELINE_HEIGHT);
  
  // Draw month labels in top half
  const months = eachMonthOfInterval({ start: minDate, end: maxDate });
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  
  months.forEach(month => {
    const monthStart = new Date(Math.max(month.getTime(), minDate.getTime()));
    const monthEnd = new Date(Math.min(endOfMonth(month).getTime(), maxDate.getTime()));
    const daysFromStart = differenceInDays(monthStart, minDate);
    const monthDays = differenceInDays(monthEnd, monthStart) + 1;
    
    const x = PADDING + TASK_NAME_WIDTH + (daysFromStart * timelineWidth / totalDays);
    const width = (monthDays * timelineWidth / totalDays);
    
    ctx.fillText(format(month, 'MMM yyyy'), x + width / 2, timelineY + 12);
    
    // Draw month separator
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, timelineY);
    ctx.lineTo(x, timelineY + TIMELINE_HEIGHT);
    ctx.stroke();
  });
  
  // Draw date numbers/labels in bottom half
  ctx.font = '8px Arial';
  ctx.fillStyle = '#6b7280';
  
  // Show dates at intervals based on timeline width
  const dayInterval = totalDays > 90 ? 7 : totalDays > 45 ? 3 : 1; // Weekly for >90 days, every 3 days for >45, daily otherwise
  
  for (let i = 0; i <= totalDays; i += dayInterval) {
    const currentDate = addDays(minDate, i);
    const x = PADDING + TASK_NAME_WIDTH + (i * timelineWidth / totalDays);
    
    // Draw date label
    const dateLabel = totalDays > 60 ? format(currentDate, 'M/d') : format(currentDate, 'MMM d');
    ctx.fillText(dateLabel, x, timelineY + 28);
    
    // Draw tick mark
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, timelineY + TIMELINE_HEIGHT - 10);
    ctx.lineTo(x, timelineY + TIMELINE_HEIGHT);
    ctx.stroke();
  }
  
  // Draw column separator
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING + TASK_NAME_WIDTH, timelineY);
  ctx.lineTo(PADDING + TASK_NAME_WIDTH, canvas.height - PADDING);
  ctx.stroke();
  
  // Draw timeline bottom border
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, yOffset);
  ctx.lineTo(canvas.width - PADDING, yOffset);
  ctx.stroke();
  
  // Draw tasks
  ctx.textAlign = 'left';
  tasks.forEach((task, index) => {
    const rowY = yOffset + (index * ROW_HEIGHT);
    
    // Alternate row background
    if (index % 2 === 0) {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(PADDING, rowY, canvas.width - PADDING * 2, ROW_HEIGHT);
    }
    
    // Draw task name
    ctx.fillStyle = '#111827';
    ctx.font = '11px Arial';
    const taskName = task.name.length > 40 ? task.name.substring(0, 37) + '...' : task.name;
    ctx.fillText(taskName, PADDING + 5, rowY + ROW_HEIGHT / 2 + 4);
    
    // Calculate bar position
    const taskStart = new Date(task.start);
    const taskEnd = new Date(task.end);
    const startDays = differenceInDays(taskStart, minDate);
    const taskDays = differenceInDays(taskEnd, taskStart);
    
    const barX = PADDING + TASK_NAME_WIDTH + (startDays * timelineWidth / totalDays);
    const barWidth = Math.max(taskDays * timelineWidth / totalDays, 3); // Minimum 3px
    const barY = rowY + (ROW_HEIGHT - BAR_HEIGHT) / 2;
    
    // Get category color
    const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other'];
    
    // Draw bar
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barWidth, BAR_HEIGHT);
    
    // Draw bar border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, BAR_HEIGHT);
    
    // Draw progress overlay
    if (task.progress > 0 && task.progress < 100) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      const progressWidth = barWidth * (task.progress / 100);
      ctx.fillRect(barX, barY, progressWidth, BAR_HEIGHT);
    }
    
    // Draw row separator
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, rowY + ROW_HEIGHT);
    ctx.lineTo(canvas.width - PADDING, rowY + ROW_HEIGHT);
    ctx.stroke();
  });
}

/**
 * Export Gantt chart to PDF - drawn from scratch on canvas
 * Downloads the PDF file directly
 */
export async function exportGanttToPDF(options: GanttPdfExportOptions): Promise<Blob | void> {
  const {
    tasks,
    projectName,
    projectNumber,
    clientName,
    ganttContainer,
    dateRange,
    includeProjectHeader = true,
    includeTaskDetails = false,
    previewOnly = false,
  } = options;

  // Filter tasks by date range if provided
  const filteredTasks = dateRange 
    ? filterTasksByDateRange(tasks, dateRange)
    : tasks;

  if (filteredTasks.length === 0) {
    throw new Error('No tasks found in the selected date range');
  }

  try {
    console.log('Starting PDF generation from scratch -', filteredTasks.length, 'tasks');

    // Create canvas
    const canvas = document.createElement('canvas');
    
    // Draw Gantt chart on canvas
    drawGanttChart(
      canvas,
      filteredTasks,
      projectName,
      projectNumber,
      clientName,
      dateRange,
      includeProjectHeader
    );
    
    console.log('Gantt chart drawn on canvas:', canvas.width, 'x', canvas.height);

    // Convert canvas to image
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Calculate dimensions to fit landscape A4 (297mm x 210mm)
    const pdfWidth = 277; // 297 - 20mm margins
    const pdfHeight = 190; // 210 - 20mm margins
    
    // Calculate aspect ratio
    const imgAspect = canvas.width / canvas.height;
    const pdfAspect = pdfWidth / pdfHeight;
    
    let finalWidth = pdfWidth;
    let finalHeight = pdfHeight;
    
    if (imgAspect > pdfAspect) {
      // Image is wider than PDF page
      finalHeight = pdfWidth / imgAspect;
    } else {
      // Image is taller than PDF page
      finalWidth = pdfHeight * imgAspect;
    }
    
    // Add image to PDF
    pdf.addImage(imgData, 'JPEG', 10, 10, finalWidth, finalHeight);
    
    // Add task notes on separate page if requested
    if (includeTaskDetails) {
      console.log('Processing task notes for', filteredTasks.length, 'tasks');
      const tableRows: string[] = [];
      
      filteredTasks.forEach((task) => {
        const notes = extractNotes(task);
        const hasNotes = notes.taskNotes || (notes.phaseNotes && notes.phaseNotes.length > 0);
        
        console.log(`Task "${task.name}":`, {
          schedule_notes: task.schedule_notes,
          extracted: notes,
          hasNotes
        });
        
        if (hasNotes) {
          if (notes.taskNotes) {
            tableRows.push(`${task.name}: ${notes.taskNotes}`);
          }
          if (notes.phaseNotes && notes.phaseNotes.length > 0) {
            notes.phaseNotes.forEach(phaseNote => {
              tableRows.push(`${task.name} - Phase ${phaseNote.phase}: ${phaseNote.notes}`);
            });
          }
        }
      });
      
      console.log('Total notes found:', tableRows.length);
      
      if (tableRows.length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Task Notes & Details', 10, 15);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        let yPos = 25;
        
        tableRows.forEach((row, index) => {
          if (yPos > 195) {
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Task Notes & Details (continued)', 10, 15);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            yPos = 25;
          }
          
          // Split by task name and note
          const colonIndex = row.indexOf(': ');
          if (colonIndex > -1) {
            const taskName = row.substring(0, colonIndex);
            const noteText = row.substring(colonIndex + 2);
            
            // Task name in bold
            pdf.setFont('helvetica', 'bold');
            pdf.text(taskName + ':', 10, yPos);
            
            // Note text wrapped
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(noteText, 267);
            pdf.text(lines, 15, yPos + 5);
            yPos += 5 + (lines.length * 4) + 3;
          } else {
            // Fallback: just wrap the whole thing
            const lines = pdf.splitTextToSize(row, 277);
            pdf.text(lines, 10, yPos);
            yPos += lines.length * 4 + 3;
          }
        });
        
        console.log('Added task notes to PDF -', tableRows.length, 'notes');
      } else {
        console.log('No notes found to add to PDF');
      }
    }

    // Return blob for preview or download PDF
    if (previewOnly) {
      const blob = pdf.output('blob');
      console.log('PDF preview blob generated');
      return blob;
    } else {
      const fileName = `${projectNumber || projectName}_Gantt_Chart_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      console.log('PDF generation complete');
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
