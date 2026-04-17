/**
 * ReportEngine — Shared export/report system for the Uzbekistan Policy Engine
 * Provides CSV download, PNG chart export, PDF report generation, and floating toolbar
 *
 * Dependencies (loaded in each consuming page):
 *   - Chart.js (for canvas lookup)
 *   - jsPDF: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 *
 * Usage:
 *   ReportEngine.downloadCSV(title, headers, rows)
 *   ReportEngine.downloadChartPNG(canvasId)
 *   ReportEngine.generatePDF(config)
 *   ReportEngine.showExportToolbar(containerId, config)
 */

(function (global) {
  'use strict';

  /* ── helpers ── */
  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
  }

  function escapeCSV(val) {
    const s = String(val == null ? '' : val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function fmtDate() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  /* ═══════════════════════════════════════════════════════
     1. downloadCSV
  ═══════════════════════════════════════════════════════ */
  function downloadCSV(title, headers, rows, filename) {
    filename = filename || 'results.csv';
    const lines = [];
    // Title row
    lines.push(escapeCSV(title));
    lines.push(escapeCSV('Generated: ' + fmtDate() + ' · Uzbekistan Policy Engine · CERR'));
    lines.push('');
    // Header row
    lines.push(headers.map(escapeCSV).join(','));
    // Data rows
    rows.forEach(function (row) {
      lines.push(row.map(escapeCSV).join(','));
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
  }

  /* ═══════════════════════════════════════════════════════
     2. downloadChartPNG
  ═══════════════════════════════════════════════════════ */
  function downloadChartPNG(canvasId, filename) {
    filename = filename || 'chart.png';
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
      if (window.Toast) {
        Toast.show('Chart canvas not found: ' + canvasId, 'error');
      } else {
        console.error('ReportEngine: chart canvas not found —', canvasId);
      }
      return;
    }

    // Render onto an off-screen canvas with a white background
    var offCanvas = document.createElement('canvas');
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    var ctx = offCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    var url = offCanvas.toDataURL('image/png');
    triggerDownload(url, filename);
  }

  /* ═══════════════════════════════════════════════════════
     3. generatePDF
  ═══════════════════════════════════════════════════════ */
  function generatePDF(config) {
    config = config || {};

    var jsPDFLib = (global.jspdf && global.jspdf.jsPDF) || (global.jsPDF);
    if (!jsPDFLib) {
      if (window.Toast) {
        Toast.show('PDF export unavailable — jsPDF library not loaded.', 'error');
      } else {
        console.error('ReportEngine: jsPDF not loaded');
      }
      return;
    }

    var title      = config.title      || 'Policy Analysis Report';
    var subtitle   = config.subtitle   || 'Uzbekistan Macroeconomic Policy Engine · CERR';
    var date       = config.date       || fmtDate();
    var modelInfo  = config.modelInfo  || '';
    var assumptions = config.assumptions || [];   // [{name, value}]
    var kpis        = config.kpis        || [];   // [{label, value, note}]
    var tableHeaders= config.tableHeaders|| [];
    var tableRows   = config.tableRows   || [];
    var chartCanvasId = config.chartCanvasId || null;
    var filename    = config.filename   || 'report.pdf';

    var doc = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var PW = 210, PH = 297;
    var ML = 18, MR = 18;
    var CW = PW - ML - MR;   // content width = 174 mm
    var y = 0;

    /* ── palette ── */
    var NAVY = [13, 37, 80];
    var NAVY2 = [26, 58, 110];
    var WHITE = [255, 255, 255];
    var LIGHT_BG = [244, 246, 249];
    var GREEN  = [22, 163, 74];
    var ORANGE = [217, 119, 6];
    var GREY   = [100, 116, 139];
    var BORDER = [226, 232, 240];

    /* ── helper: set font shorthand ── */
    function setFont(style, size, rgb) {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      if (rgb) doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    }

    /* ── helper: filled rect ── */
    function fillRect(x, y, w, h, rgb) {
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(x, y, w, h, 'F');
    }

    /* ── helper: thin horizontal rule ── */
    function hRule(y, rgb) {
      rgb = rgb || BORDER;
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(0.3);
      doc.line(ML, y, PW - MR, y);
    }

    /* ── PAGE HEADER BAR ── */
    fillRect(0, 0, PW, 28, NAVY);
    setFont('bold', 16, WHITE);
    doc.text(title, ML, 11);
    setFont('normal', 9, [180, 200, 230]);
    doc.text(subtitle, ML, 17);
    setFont('normal', 8, [160, 180, 220]);
    doc.text('Generated: ' + date + '   |   Center for Economic Research & Reforms (CERR)', ML, 23.5);

    y = 34;

    /* ── MODEL INFO BOX ── */
    if (modelInfo) {
      fillRect(ML, y, CW, 2, NAVY2);
      y += 3;
      fillRect(ML, y, CW, 1, LIGHT_BG);
      setFont('bold', 9, NAVY2);
      doc.text('Model Information', ML + 3, y + 6);
      y += 8;
      setFont('normal', 8, [71, 85, 105]);
      var infoLines = doc.splitTextToSize(modelInfo, CW - 6);
      doc.text(infoLines, ML + 3, y);
      y += infoLines.length * 4 + 4;
      hRule(y);
      y += 4;
    }

    /* ── ASSUMPTIONS / PARAMETERS TABLE ── */
    if (assumptions.length > 0) {
      setFont('bold', 10, NAVY2);
      doc.text('Scenario Assumptions', ML, y);
      y += 5;

      var colW = CW / 2;
      var rowH = 6.5;
      assumptions.forEach(function (item, i) {
        var rowBg = (i % 2 === 0) ? [248, 250, 252] : WHITE;
        fillRect(ML, y - 1, CW, rowH, rowBg);
        setFont('normal', 8.5, [51, 65, 85]);
        doc.text(String(item.name), ML + 2, y + 3.5);
        setFont('bold', 8.5, NAVY2);
        doc.text(String(item.value), ML + colW + 2, y + 3.5);
        y += rowH;
      });
      y += 4;
      hRule(y);
      y += 5;
    }

    /* ── KPI SUMMARY (2 per row) ── */
    if (kpis.length > 0) {
      setFont('bold', 10, NAVY2);
      doc.text('Key Results', ML, y);
      y += 5;

      var kpiW = (CW - 4) / 2;
      var kpiH = 18;
      kpis.forEach(function (kpi, i) {
        var col = i % 2;
        var kx = ML + col * (kpiW + 4);
        if (col === 0 && i > 0) y += kpiH + 3;

        fillRect(kx, y, kpiW, kpiH, LIGHT_BG);
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setLineWidth(0.4);
        doc.rect(kx, y, kpiW, kpiH);

        setFont('normal', 7.5, GREY);
        doc.text(String(kpi.label).toUpperCase(), kx + 3, y + 5);

        setFont('bold', 14, NAVY2);
        doc.text(String(kpi.value), kx + 3, y + 12);

        if (kpi.note) {
          setFont('normal', 7, GREY);
          doc.text(String(kpi.note), kx + 3, y + 16.5);
        }
      });
      // advance y past the last row of KPIs
      var kpiRows = Math.ceil(kpis.length / 2);
      y += kpiRows * (kpiH + 3) + 4;
      hRule(y);
      y += 5;
    }

    /* ── RESULTS TABLE ── */
    if (tableHeaders.length > 0 && tableRows.length > 0) {
      // Check if we need a new page
      var tableEst = tableRows.length * 6.5 + 20;
      if (y + tableEst > PH - 20) {
        doc.addPage();
        y = 16;
      }

      setFont('bold', 10, NAVY2);
      doc.text('Results Table', ML, y);
      y += 5;

      var tColW = CW / tableHeaders.length;
      var tRowH = 6.5;

      // Header row
      fillRect(ML, y - 1, CW, tRowH + 1, NAVY2);
      tableHeaders.forEach(function (h, ci) {
        setFont('bold', 8, WHITE);
        doc.text(String(h), ML + ci * tColW + 2, y + 4);
      });
      y += tRowH;

      // Data rows
      tableRows.forEach(function (row, ri) {
        if (y + tRowH > PH - 18) {
          doc.addPage();
          y = 16;
          // Repeat header on new page
          fillRect(ML, y - 1, CW, tRowH + 1, NAVY2);
          tableHeaders.forEach(function (h, ci) {
            setFont('bold', 8, WHITE);
            doc.text(String(h), ML + ci * tColW + 2, y + 4);
          });
          y += tRowH;
        }

        var rowBg = (ri % 2 === 0) ? [248, 250, 252] : WHITE;
        fillRect(ML, y - 1, CW, tRowH, rowBg);

        row.forEach(function (cell, ci) {
          var cellStr = String(cell == null ? '' : cell);
          var color = [51, 65, 85];

          // Colour-code % change column (last column)
          if (ci === row.length - 1 && cellStr.includes('%')) {
            var numVal = parseFloat(cellStr);
            if (!isNaN(numVal)) {
              color = numVal > 0 ? GREEN : numVal < 0 ? [192, 57, 43] : GREY;
            }
          }

          setFont(ci === 0 ? 'normal' : 'normal', 8, color);
          doc.text(cellStr, ML + ci * tColW + 2, y + 4);
        });
        y += tRowH;
      });

      y += 6;
      hRule(y);
      y += 5;
    }

    /* ── CHART IMAGE ── */
    if (chartCanvasId) {
      var canvas = document.getElementById(chartCanvasId);
      if (canvas) {
        var spaceLeft = PH - y - 20;
        if (spaceLeft < 50) {
          doc.addPage();
          y = 16;
          spaceLeft = PH - y - 20;
        }

        // White-background version
        var offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        var ctx = offCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        ctx.drawImage(canvas, 0, 0);

        var imgData = offCanvas.toDataURL('image/jpeg', 0.92);
        var imgH = Math.min(spaceLeft - 10, 80);
        var imgW = Math.min(CW, (canvas.width / canvas.height) * imgH);

        setFont('bold', 10, NAVY2);
        doc.text('Chart', ML, y);
        y += 5;
        doc.addImage(imgData, 'JPEG', ML, y, imgW, imgH);
        y += imgH + 5;
      }
    }

    /* ── FOOTER (every page) ── */
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      fillRect(0, PH - 10, PW, 10, NAVY);
      setFont('normal', 7, [180, 200, 230]);
      doc.text('Center for Economic Research and Reforms (CERR)  ·  Uzbekistan Policy Engine  ·  ' + fmtDate(),
        ML, PH - 3.5);
      setFont('normal', 7, [180, 200, 230]);
      doc.text('Page ' + p + ' of ' + pageCount, PW - MR - 16, PH - 3.5);
    }

    doc.save(filename);
  }

  /* ═══════════════════════════════════════════════════════
     4. showExportToolbar
  ═══════════════════════════════════════════════════════ */
  function showExportToolbar(containerId, config) {
    config = config || {};
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('ReportEngine.showExportToolbar: container not found:', containerId);
      return;
    }

    var csvLabel    = config.csvLabel    || '📊 CSV';
    var pngLabel    = config.pngLabel    || '🖼 PNG';
    var pdfLabel    = config.pdfLabel    || '📄 PDF Report';
    var onCSV       = config.onCSV       || null;
    var onPNG       = config.onPNG       || null;
    var onPDF       = config.onPDF       || null;
    var extraButtons= config.extraButtons|| [];   // [{label, onClick}]

    var style = [
      '.re-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
      'padding:12px 20px;background:#f8fafc;border-radius:10px;',
      'border:1px solid #e2e8f0;margin:16px 0;}',
      '.re-label{font-size:12px;font-weight:600;color:#64748b;}',
      '.re-btn{padding:7px 16px;border:1px solid #cbd5e1;background:white;',
      'border-radius:8px;font-size:12px;cursor:pointer;color:#334155;',
      'display:inline-flex;align-items:center;gap:6px;transition:all 0.15s;font-family:inherit;}',
      '.re-btn:hover{background:var(--navy2,#1a3a6e);color:white;border-color:var(--navy2,#1a3a6e);}'
    ].join('');

    // Inject styles once
    if (!document.getElementById('re-toolbar-styles')) {
      var styleEl = document.createElement('style');
      styleEl.id = 're-toolbar-styles';
      styleEl.textContent = style;
      document.head.appendChild(styleEl);
    }

    var toolbar = document.createElement('div');
    toolbar.className = 're-toolbar';

    var label = document.createElement('span');
    label.className = 're-label';
    label.textContent = 'Export Results:';
    toolbar.appendChild(label);

    function makeBtn(text, handler) {
      var btn = document.createElement('button');
      btn.className = 're-btn';
      btn.innerHTML = text;
      if (handler) btn.addEventListener('click', handler);
      return btn;
    }

    if (onCSV) toolbar.appendChild(makeBtn(csvLabel, onCSV));
    if (onPNG) toolbar.appendChild(makeBtn(pngLabel, onPNG));
    if (onPDF) toolbar.appendChild(makeBtn(pdfLabel, onPDF));
    extraButtons.forEach(function (eb) {
      toolbar.appendChild(makeBtn(eb.label, eb.onClick));
    });

    container.appendChild(toolbar);
  }

  /* ── Expose ── */
  global.ReportEngine = {
    downloadCSV:       downloadCSV,
    downloadChartPNG:  downloadChartPNG,
    generatePDF:       generatePDF,
    showExportToolbar: showExportToolbar
  };

}(typeof window !== 'undefined' ? window : this));
