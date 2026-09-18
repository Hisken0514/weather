/**
 * generateReport - 使用 @react-pdf/renderer 產生 PDF 報告
 */

import { pdf, Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer';
import type {
  FormSchema,
  DownloadReportFieldProperties,
  Field,
  MatrixFieldProperties,
  MatrixDropdownFieldProperties,
  MatrixDynamicFieldProperties,
  PanelFieldProperties,
} from '@/types/form';

// Register Noto Sans TC for Chinese support
Font.register({
  family: 'NotoSansTC',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosanstc/v39/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_Co.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notosanstc/v39/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz70e1_Co.ttf',
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansTC',
    fontSize: 10,
    padding: 40,
    paddingBottom: 60,
  },
  coverPage: {
    fontFamily: 'NotoSansTC',
    padding: 40,
    paddingBottom: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLogo: {
    width: 120,
    marginBottom: 30,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 20,
    width: '100%',
  },
  coverDate: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
  },
  // Compact field card
  fieldCard: {
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
    borderRadius: 3,
    maxWidth: '100%',
  },
  fieldLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    maxWidth: '100%',
  },
  // Panel group header
  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#333',
    marginTop: 6,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#aaa',
    borderBottomStyle: 'solid',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999',
  },
  signatureImage: {
    width: 200,
    height: 80,
    objectFit: 'contain',
  },
  // Matrix table styles
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    borderBottomStyle: 'solid',
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    padding: 3,
    fontSize: 8,
  },
  tableCellBold: {
    padding: 3,
    fontSize: 8,
    fontWeight: 700,
  },
  // Two-column layout for simple fields
  twoColRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  twoColItem: {
    width: '48%',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
    borderRadius: 3,
  },
  twoColSpacer: {
    width: 4,
  },
});

interface GenerateReportParams {
  schema: FormSchema;
  values: Record<string, unknown>;
  properties: DownloadReportFieldProperties;
  logoUrl?: string;
  reportDate?: Date;
}

/** Strip HTML tags AND decode common HTML entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .trim();
}

/**
 * Insert zero-width spaces between CJK characters so @react-pdf/renderer
 * knows where it can break lines. Without this, Chinese text has no
 * breaking opportunities and overflows.
 */
function addWordBreaks(text: string): string {
  // Match CJK Unified Ideographs, punctuation, fullwidth forms, etc.
  return text.replace(/([\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF])/g, '\u200B$1');
}

/** Get display label for a field, stripping HTML and adding word breaks */
function getLabel(field: Field): string {
  return addWordBreaks(stripHtml(field.label || field.name));
}

function resolveTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const val = values[key.trim()];
    return val != null ? String(val) : '';
  });
}

/** Resolve special matrix values like __none__, __other__ */
function resolveSpecialValue(
  val: string,
  noneLabel?: string,
  otherLabel?: string,
): string {
  if (val === '__none__') return noneLabel || '無';
  if (val === '__other__') return otherLabel || '其他';
  return val;
}

function formatFieldValue(field: Field, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';

  let result: string;
  switch (field.type) {
    case 'boolean': {
      const props = (field as { properties?: { labelTrue?: string; labelFalse?: string } }).properties;
      result = value ? (props?.labelTrue || '是') : (props?.labelFalse || '否');
      break;
    }
    case 'select':
    case 'radio': {
      const props = (field as { properties?: { options?: { value: string | number; label: string }[] } }).properties;
      const opt = props?.options?.find(o => String(o.value) === String(value));
      result = opt?.label || String(value);
      break;
    }
    case 'checkbox':
    case 'multiselect': {
      if (!Array.isArray(value)) { result = String(value); break; }
      const props = (field as { properties?: { options?: { value: string | number; label: string }[] } }).properties;
      result = value.map(v => {
        const opt = props?.options?.find(o => String(o.value) === String(v));
        return opt?.label || String(v);
      }).join('、');
      break;
    }
    case 'rating':
      result = `${value} 分`;
      break;
    case 'multipletext': {
      if (typeof value !== 'object' || value === null) { result = String(value); break; }
      const items = (field as { properties?: { items?: { name: string; label: string }[] } }).properties?.items;
      const entries = Object.entries(value as Record<string, unknown>);
      result = entries.map(([k, v]) => {
        const item = items?.find(i => i.name === k);
        return `${item?.label || k}：${v ?? ''}`;
      }).join('\n');
      break;
    }
    default:
      if (typeof value === 'object') { result = JSON.stringify(value); break; }
      result = String(value);
  }
  return addWordBreaks(result);
}

/** Check if a field is "simple" (short single-line value, good for 2-col layout) */
function isSimpleField(field: Field): boolean {
  return ['text', 'email', 'phone', 'url', 'password', 'number', 'slider',
    'date', 'time', 'datetime', 'boolean', 'rating', 'select', 'radio'].includes(field.type);
}

/** Check if a field needs full-width (matrix, textarea, multipletext, signature, etc.) */
function isWideField(field: Field): boolean {
  return ['matrix', 'matrixdropdown', 'matrixdynamic', 'textarea', 'multipletext',
    'signature', 'checkbox', 'multiselect', 'imagepicker', 'ranking',
    'panel', 'paneldynamic', 'cascadingselect', 'expression'].includes(field.type);
}

function isSignatureField(field: Field): boolean {
  return field.type === 'signature';
}

/** Render matrix single-select: { rowId: columnId } */
function MatrixEntry({ field, value }: { field: Field; value: unknown }) {
  const props = (field as unknown as { properties?: MatrixFieldProperties }).properties;
  const rows = props?.rows ?? [];
  const columns = props?.columns ?? [];
  const noneLabel = props?.noneLabel;
  const otherLabel = props?.otherLabel;
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, string>;

  const getColLabel = (id: string) => {
    const resolved = resolveSpecialValue(id, noneLabel, otherLabel);
    if (resolved !== id) return resolved;
    return columns.find(c => c.id === id)?.label ?? id;
  };

  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{getLabel(field)}</Text>
      <View style={styles.tableHeaderRow}>
        <View style={{ width: '65%' }}><Text style={styles.tableCellBold}>項目</Text></View>
        <View style={{ width: '35%' }}><Text style={styles.tableCellBold}>選擇</Text></View>
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.tableRow} wrap={false}>
          <View style={{ width: '65%' }}><Text style={styles.tableCell}>{addWordBreaks(stripHtml(row.label))}</Text></View>
          <View style={{ width: '35%' }}><Text style={styles.tableCell}>
            {data[row.id] ? addWordBreaks(getColLabel(data[row.id])) : '—'}
          </Text></View>
        </View>
      ))}
    </View>
  );
}

/** Render matrix dropdown: { rowId: { colName: value } } */
function MatrixDropdownEntry({ field, value }: { field: Field; value: unknown }) {
  const props = (field as unknown as { properties?: MatrixDropdownFieldProperties }).properties;
  const rows = props?.rows ?? [];
  const columns = props?.columns ?? [];
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, Record<string, unknown>>;

  const formatCellValue = (col: MatrixDropdownFieldProperties['columns'][number], val: unknown): string => {
    if (val === undefined || val === null || val === '') return '—';
    if (col.options) {
      const opt = col.options.find(o => String(o.value) === String(val));
      if (opt) return opt.label;
    }
    return String(val);
  };

  const colCount = columns.length;
  const labelWidth = `${Math.max(25, Math.round(60 / (colCount + 1)))}%`;
  const colWidth = `${Math.round((100 - parseFloat(labelWidth)) / colCount)}%`;

  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{getLabel(field)}</Text>
      <View style={styles.tableHeaderRow}>
        <View style={{ width: labelWidth }}><Text style={styles.tableCellBold}>項目</Text></View>
        {columns.map((col) => (
          <View key={col.name} style={{ width: colWidth }}><Text style={styles.tableCellBold}>{addWordBreaks(col.label)}</Text></View>
        ))}
      </View>
      {rows.map((row) => {
        const rowData = data[row.id] ?? {};
        return (
          <View key={row.id} style={styles.tableRow} wrap={false}>
            <View style={{ width: labelWidth }}><Text style={styles.tableCell}>{addWordBreaks(stripHtml(row.label))}</Text></View>
            {columns.map((col) => (
              <View key={col.name} style={{ width: colWidth }}><Text style={styles.tableCell}>
                {addWordBreaks(formatCellValue(col, rowData[col.name]))}
              </Text></View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** Render matrix dynamic: Array<{ colName: value }> */
function MatrixDynamicEntry({ field, value }: { field: Field; value: unknown }) {
  const props = (field as unknown as { properties?: MatrixDynamicFieldProperties }).properties;
  const columns = props?.columns ?? [];
  const rows = Array.isArray(value) ? value as Record<string, unknown>[] : [];

  const colCount = columns.length;
  const colWidth = `${Math.round(95 / colCount)}%`;

  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{getLabel(field)}</Text>
      <View style={styles.tableHeaderRow}>
        <View style={{ width: '5%' }}><Text style={styles.tableCellBold}>#</Text></View>
        {columns.map((col) => (
          <View key={col.name} style={{ width: colWidth }}><Text style={styles.tableCellBold}>{addWordBreaks(col.label)}</Text></View>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow} wrap={false}>
          <View style={{ width: '5%' }}><Text style={styles.tableCell}>{idx + 1}</Text></View>
          {columns.map((col) => (
            <View key={col.name} style={{ width: colWidth }}><Text style={styles.tableCell}>
              {row[col.name] != null ? addWordBreaks(String(row[col.name])) : '—'}
            </Text></View>
          ))}
        </View>
      ))}
      {rows.length === 0 && (
        <Text style={styles.fieldValue}>—</Text>
      )}
    </View>
  );
}

type FlatItem =
  | { type: 'field'; field: Field }
  | { type: 'panelTitle'; title: string }
  | { type: 'paneldynamic'; field: Field };

/** Recursively flatten fields — expand panel children inline, keep paneldynamic as special item */
function flattenFields(
  fields: Field[],
  excludeTypes: string[],
): FlatItem[] {
  const result: FlatItem[] = [];

  for (const field of fields) {
    if (excludeTypes.includes(field.type)) continue;

    // paneldynamic: keep as special item (data is an array)
    if (field.type === 'paneldynamic') {
      result.push({ type: 'paneldynamic', field });
      continue;
    }

    if (field.type === 'panel') {
      const panelProps = (field as unknown as { properties?: PanelFieldProperties }).properties;
      const title = panelProps?.title || getLabel(field);
      if (title && title !== field.name) {
        result.push({ type: 'panelTitle', title: addWordBreaks(stripHtml(title)) });
      }
      // Recursively flatten children
      const children = panelProps?.fields ?? [];
      const flattened = flattenFields(children as Field[], excludeTypes);
      result.push(...flattened);
      continue;
    }

    // Section — render as a sub-header
    if (field.type === 'section') {
      result.push({ type: 'panelTitle', title: getLabel(field) });
      continue;
    }

    result.push({ type: 'field', field });
  }

  return result;
}

function FieldEntry({ field, value }: { field: Field; value: unknown }) {
  // Signature → embed image
  if (isSignatureField(field) && typeof value === 'string' && value.startsWith('data:')) {
    return (
      <View style={styles.fieldCard} wrap={false}>
        <Text style={styles.fieldLabel}>{getLabel(field)}</Text>
        <Image src={value} style={styles.signatureImage} />
      </View>
    );
  }

  // Matrix types
  if (field.type === 'matrix') {
    return <MatrixEntry field={field} value={value} />;
  }
  if (field.type === 'matrixdropdown') {
    return <MatrixDropdownEntry field={field} value={value} />;
  }
  if (field.type === 'matrixdynamic') {
    return <MatrixDynamicEntry field={field} value={value} />;
  }

  return (
    <View style={styles.fieldCard} wrap={false}>
      <Text style={styles.fieldLabel}>{getLabel(field)}</Text>
      <Text style={styles.fieldValue}>{formatFieldValue(field, value)}</Text>
    </View>
  );
}

/** Render paneldynamic: array of items, each with child field values */
function PanelDynamicEntry({
  field,
  value,
  excludeTypes,
}: {
  field: Field;
  value: unknown;
  excludeTypes: string[];
}) {
  const panelProps = (field as unknown as { properties?: PanelFieldProperties & { itemLabel?: string } }).properties;
  const templateFields = (panelProps?.fields ?? []) as Field[];
  const itemLabel = panelProps?.itemLabel || '項目';
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const title = panelProps?.title || getLabel(field);

  return (
    <View>
      {title && title !== field.name && (
        <Text style={styles.panelTitle}>{addWordBreaks(stripHtml(title))}</Text>
      )}
      {items.length === 0 && (
        <View style={styles.fieldCard} wrap={false}>
          <Text style={styles.fieldValue}>—</Text>
        </View>
      )}
      {items.map((item, idx) => {
        const filteredFields = templateFields.filter(f => !excludeTypes.includes(f.type));
        return (
          <View key={idx} style={{ marginBottom: 6 }}>
            <Text style={styles.panelTitle}>{addWordBreaks(`${itemLabel} ${idx + 1}`)}</Text>
            {filteredFields.map((childField) => (
              <FieldEntry
                key={childField.id}
                field={childField}
                value={item[childField.name]}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function Footer() {
  const now = new Date().toLocaleDateString('zh-TW');
  return (
    <View style={styles.footer} fixed>
      <Text>{now}</Text>
      <Text render={({ pageNumber, totalPages }) => `第 ${pageNumber} 頁，共 ${totalPages} 頁`} />
    </View>
  );
}

/** Render a list of flat items, grouping simple fields into 2-col rows */
function RenderFlatItems({
  items,
  values,
  excludeTypes,
}: {
  items: FlatItem[];
  values: Record<string, unknown>;
  excludeTypes: string[];
}) {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < items.length) {
    const item = items[i];

    if (item.type === 'panelTitle') {
      elements.push(
        <Text key={`pt-${i}`} style={styles.panelTitle}>{item.title}</Text>
      );
      i++;
      continue;
    }

    if (item.type === 'paneldynamic') {
      elements.push(
        <PanelDynamicEntry
          key={`pd-${item.field.id}`}
          field={item.field}
          value={values[item.field.name]}
          excludeTypes={excludeTypes}
        />
      );
      i++;
      continue;
    }

    const field = item.field;

    // If it's a simple field, try to pair with the next simple field for 2-col
    if (isSimpleField(field) && !isWideField(field)) {
      const next = i + 1 < items.length ? items[i + 1] : null;
      if (next && next.type === 'field' && isSimpleField(next.field) && !isWideField(next.field)) {
        // Two-col row
        elements.push(
          <View key={`row-${i}`} style={styles.twoColRow} wrap={false}>
            <View style={styles.twoColItem}>
              <Text style={styles.fieldLabel}>{getLabel(field)}</Text>
              <Text style={styles.fieldValue}>{formatFieldValue(field, values[field.name])}</Text>
            </View>
            <View style={styles.twoColSpacer} />
            <View style={styles.twoColItem}>
              <Text style={styles.fieldLabel}>{getLabel(next.field)}</Text>
              <Text style={styles.fieldValue}>{formatFieldValue(next.field, values[next.field.name])}</Text>
            </View>
          </View>
        );
        i += 2;
        continue;
      }
    }

    // Full-width field
    elements.push(
      <FieldEntry key={`f-${field.id}`} field={field} value={values[field.name]} />
    );
    i++;
  }

  return <>{elements}</>;
}

function ReportDocument({ schema, values, properties, logoUrl, reportDate }: GenerateReportParams) {
  const excludeTypes = properties.excludeFieldTypes ?? ['welcome', 'ending', 'downloadreport', 'hidden', 'html'];
  const showDate = properties.showDate ?? true;
  const dateLabel = properties.dateLabel || '日期';
  const showLogo = properties.showLogo ?? true;
  const coverTitle = properties.coverTitle
    ? resolveTemplate(properties.coverTitle, values)
    : '報告';
  // 依最長行字數動態縮放字體，限縮在 16–28pt，確保長名稱不超出 A4 版面
  const maxLineLen = Math.max(...coverTitle.split('\n').map(l => l.length), 1);
  const coverTitleFontSize = Math.max(16, Math.min(28, Math.floor(480 / maxLineLen)));

  const now = (reportDate ?? new Date()).toLocaleDateString('zh-TW');

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {showLogo && logoUrl && (
          <Image src={logoUrl} style={styles.coverLogo} />
        )}
        <Text style={[styles.coverTitle, { fontSize: coverTitleFontSize }]}>{coverTitle}</Text>
        {showDate && (
          <Text style={styles.coverDate}>{dateLabel}：{now}</Text>
        )}
        <Footer />
      </Page>

      {/* Content Pages — use wrap so content flows across pages automatically */}
      {schema.pages.map((page) => {
        const flatItems = flattenFields(page.fields, excludeTypes);
        if (flatItems.length === 0) return null;
        return (
          <Page key={page.id} size="A4" style={styles.page} wrap>
            {page.title && <Text style={styles.pageTitle}>{page.title}</Text>}
            <RenderFlatItems items={flatItems} values={values} excludeTypes={excludeTypes} />
            <Footer />
          </Page>
        );
      })}
    </Document>
  );
}

export async function generateReport(params: GenerateReportParams) {
  const blob = await pdf(<ReportDocument {...params} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const title = params.properties.coverTitle
    ? resolveTemplate(params.properties.coverTitle, params.values)
    : '報告';
  a.download = `${title.replace(/\n/g, '')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
