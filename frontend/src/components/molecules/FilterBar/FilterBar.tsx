import React from 'react'
import { Row, Col } from 'antd'
import { type FilterBarProps } from './FilterBar.types'

const FilterBar: React.FC<FilterBarProps> = ({ options, className = '' }) => {
  if (!options.length) {
    return null
  }

  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm ${className}`.trim()}
    >
      <Row gutter={[16, 16]}>
        {options.map((option) => (
          <Col
            key={option.key}
            xs={24}
            sm={12}
            md={8}
            lg={6}
            {...option.colProps}
          >
            {option.content}
          </Col>
        ))}
      </Row>
    </div>
  )
}
export default FilterBar
