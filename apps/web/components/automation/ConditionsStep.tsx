'use client';

import type {
  AutomationCondition,
  AutomationConditionField,
  AutomationConditionOperator,
} from '@anoud-job/types';

const FIELDS: { value: AutomationConditionField; label: string; isArray?: boolean }[] = [
  { value: 'contact.channel', label: 'Contact Channel' },
  { value: 'contact.source', label: 'Contact Source' },
  { value: 'contact.tags', label: 'Contact Tags', isArray: true },
  { value: 'message.content', label: 'Message Content' },
  { value: 'conversation.assigned_agent_id', label: 'Assigned Agent' },
  { value: 'conversation.assigned_team_id', label: 'Assigned Team' },
];

const TEXT_OPERATORS: { value: AutomationConditionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const ARRAY_OPERATORS: { value: AutomationConditionOperator; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const VALUELESS_OPS: AutomationConditionOperator[] = ['is_empty', 'is_not_empty'];

interface Props {
  conditions: AutomationCondition[];
  onChange: (conditions: AutomationCondition[]) => void;
}

export default function ConditionsStep({ conditions, onChange }: Props) {
  function add() {
    onChange([
      ...conditions,
      { field: 'contact.channel', operator: 'equals', value: '' },
    ]);
  }

  function update(index: number, patch: Partial<AutomationCondition>) {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  }

  function remove(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        But only if… <span className="text-gray-400 text-sm">(optional)</span>
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        All conditions must match (AND logic)
      </p>

      {conditions.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl mb-4">
          <p className="text-sm text-gray-400">
            No conditions — rule will fire for all matches
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {conditions.map((cond, i) => {
            const field = FIELDS.find((f) => f.value === cond.field);
            const operators = field?.isArray ? ARRAY_OPERATORS : TEXT_OPERATORS;
            const needsValue = !VALUELESS_OPS.includes(cond.operator);

            return (
              <div
                key={i}
                className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={cond.field}
                    onChange={(e) => {
                      const newField = e.target.value as AutomationConditionField;
                      const newFieldDef = FIELDS.find((f) => f.value === newField);
                      const newOps = newFieldDef?.isArray
                        ? ARRAY_OPERATORS
                        : TEXT_OPERATORS;
                      const opStillValid = newOps.some(
                        (o) => o.value === cond.operator,
                      );
                      update(i, {
                        field: newField,
                        operator: opStillValid ? cond.operator : newOps[0].value,
                      });
                    }}
                    className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  >
                    {FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) =>
                      update(i, {
                        operator: e.target.value as AutomationConditionOperator,
                      })
                    }
                    className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  >
                    {operators.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {needsValue ? (
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => update(i, { value: e.target.value })}
                      placeholder="Value"
                      className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  ) : (
                    <div className="px-2.5 py-2 text-sm text-gray-400 italic">
                      No value needed
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="px-4 py-2 text-sm font-medium text-[#25D366] bg-white border border-[#25D366] rounded-lg hover:bg-green-50 transition-colors"
      >
        + Add Condition
      </button>
    </div>
  );
}
