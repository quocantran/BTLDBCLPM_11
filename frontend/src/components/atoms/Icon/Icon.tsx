import React from 'react'
import { IconProps } from './Icon.types'

export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  }

  const icons = {
    dashboard: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
      >
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ),
    notifications: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
      >
        <path
          d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    'arrow-left': (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 12H5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 19L5 12L12 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    exams: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
      >
        <path
          d="M22 10v6M2 10l10-5 10 5-10 5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 12v5c3 3 9 3 12 0v-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    students: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
      >
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="9"
          cy="7"
          r="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    results: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
      >
        <path
          d="M18 20V10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 20V4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 20v-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    certificates: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
      >
        <path
          d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="14,2 14,8 20,8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 13h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 17h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 21h8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    search: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="30"
        height="30"
        viewBox="0 0 40 40"
      >
        <path
          fill="#b6c9d6"
          d="M3.499,38.5c-0.534,0-1.036-0.208-1.414-0.585S1.5,37.035,1.5,36.501s0.208-1.036,0.585-1.414 l18.233-17.382l1.983,1.985L4.904,37.923C4.535,38.292,4.033,38.5,3.499,38.5z"
        ></path>
        <path
          fill="#788b9c"
          d="M20.31,18.405l1.293,1.294L4.559,37.561C4.276,37.844,3.899,38,3.499,38 c-0.4,0-0.777-0.156-1.06-0.439c-0.584-0.584-0.584-1.535-0.017-2.103L20.31,18.405 M20.327,17.007L1.732,34.734 c-0.976,0.976-0.976,2.558,0,3.534v0C2.22,38.756,2.859,39,3.499,39c0.64,0,1.279-0.244,1.767-0.732L23,19.683L20.327,17.007 L20.327,17.007z"
        ></path>
        <g>
          <path
            fill="#d1edff"
            d="M26,26.5c-6.893,0-12.5-5.607-12.5-12.5S19.107,1.5,26,1.5S38.5,7.107,38.5,14S32.893,26.5,26,26.5z"
          ></path>
          <path
            fill="#788b9c"
            d="M26,2c6.617,0,12,5.383,12,12s-5.383,12-12,12s-12-5.383-12-12S19.383,2,26,2 M26,1 c-7.18,0-13,5.82-13,13c0,7.18,5.82,13,13,13s13-5.82,13-13C39,6.82,33.18,1,26,1L26,1z"
          ></path>
        </g>
      </svg>
    ),
    edit: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 21h4l11-11a1 1 0 0 0 0-1.41l-2.59-2.59a1 1 0 0 0-1.41 0L4 17v4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m12.5 6.5 3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    trash: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 7h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10 11v6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 11v6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    'chevron-down': (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    drag: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeClasses[size]} ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="9" cy="5" r="1" fill="currentColor" />
        <circle cx="15" cy="5" r="1" fill="currentColor" />
        <circle cx="9" cy="12" r="1" fill="currentColor" />
        <circle cx="15" cy="12" r="1" fill="currentColor" />
        <circle cx="9" cy="19" r="1" fill="currentColor" />
        <circle cx="15" cy="19" r="1" fill="currentColor" />
      </svg>
    ),
    ai: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="20"
        height="20"
        viewBox="0 0 48 48"
      >
        <path
          fill="#2196f3"
          d="M23.426,31.911l-1.719,3.936c-0.661,1.513-2.754,1.513-3.415,0l-1.719-3.936	c-1.529-3.503-4.282-6.291-7.716-7.815l-4.73-2.1c-1.504-0.668-1.504-2.855,0-3.523l4.583-2.034	c3.522-1.563,6.324-4.455,7.827-8.077l1.741-4.195c0.646-1.557,2.797-1.557,3.443,0l1.741,4.195	c1.503,3.622,4.305,6.514,7.827,8.077l4.583,2.034c1.504,0.668,1.504,2.855,0,3.523l-4.73,2.1	C27.708,25.62,24.955,28.409,23.426,31.911z"
        ></path>
        <path
          fill="#7e57c2"
          d="M38.423,43.248l-0.493,1.131c-0.361,0.828-1.507,0.828-1.868,0l-0.493-1.131	c-0.879-2.016-2.464-3.621-4.44-4.5l-1.52-0.675c-0.822-0.365-0.822-1.56,0-1.925l1.435-0.638c2.027-0.901,3.64-2.565,4.504-4.65	l0.507-1.222c0.353-0.852,1.531-0.852,1.884,0l0.507,1.222c0.864,2.085,2.477,3.749,4.504,4.65l1.435,0.638	c0.822,0.365,0.822,1.56,0,1.925l-1.52,0.675C40.887,39.627,39.303,41.232,38.423,43.248z"
        ></path>
      </svg>
    ),
    save: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M11 2H9v3h2z" />
        <path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v4.5A1.5 1.5 0 0 1 11.5 7h-7A1.5 1.5 0 0 1 3 5.5V1H1.5a.5.5 0 0 0-.5.5m3 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4zM3 15h10v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5z" />
      </svg>
    ),
    courses: (
      <svg
        fill="#000000"
        height="16"
        width="16"
        version="1.1"
        id="Capa_1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 297 297"
      >
        <g>
          <path
            d="M287.631,193.236h-6.09V17.098c0-5.174-4.195-9.369-9.369-9.369H24.828c-5.174,0-9.369,4.195-9.369,9.369v176.139h-6.09
		c-5.174,0-9.369,4.195-9.369,9.369v30.918c0,5.174,4.195,9.369,9.369,9.369h33.377l-11.348,34.045
		c-1.636,4.908,1.018,10.215,5.926,11.852c0.983,0.328,1.981,0.482,2.964,0.482c3.923,0,7.578-2.482,8.888-6.408l13.323-39.971
		h172.002l13.323,39.971c1.31,3.926,4.965,6.408,8.888,6.408c0.981,0,1.98-0.154,2.964-0.482c4.908-1.637,7.561-6.943,5.926-11.852
		l-11.348-34.045h33.377c5.174,0,9.369-4.195,9.369-9.369v-30.918C297,197.432,292.805,193.236,287.631,193.236z M34.197,26.467
		h228.605v166.77H34.197V26.467z M18.738,224.154v-12.18h259.523v12.18H18.738z"
          />
          <path
            d="M159.363,94.895c0-11.773-9.577-21.354-21.348-21.354c-11.77,0-21.347,9.58-21.347,21.354c0,4.141,3.355,7.496,7.495,7.496
		c4.14,0,7.495-3.355,7.495-7.496c0-3.508,2.852-6.363,6.356-6.363s6.357,2.855,6.357,6.363c0,4.477-6.308,10.16-11.874,15.176
		c-7.782,7.012-15.83,14.264-15.83,24.363c0,4.139,3.355,7.494,7.495,7.494h27.704c4.139,0,7.495-3.355,7.495-7.494
		c0-4.141-3.356-7.496-7.495-7.496H136.44c1.896-1.949,4.096-3.932,6.094-5.732C150.423,114.098,159.363,106.041,159.363,94.895z"
          />
          <path
            d="M217.841,72.527c0,0-0.002,0-0.004,0c-6.278,0-12.212,2.75-16.279,7.543c-2.678,3.156-2.29,7.887,0.867,10.565
		c3.159,2.678,7.889,2.291,10.564-0.865c1.196-1.41,3.008-2.252,4.849-2.252c0,0,0.001,0,0.002,0c3.505,0,6.355,2.854,6.355,6.361
		c0,3.508-2.851,6.361-6.355,6.361c-4.14,0-7.496,3.356-7.496,7.494c0,4.141,3.356,7.496,7.496,7.496
		c3.505,0,6.355,2.854,6.355,6.361c0,3.508-2.851,6.359-6.357,6.359h-0.001c-1.84,0-3.652-0.84-4.849-2.25
		c-2.678-3.156-7.407-3.543-10.564-0.865c-3.156,2.678-3.543,7.408-0.865,10.565c4.067,4.793,10,7.541,16.276,7.541
		c0.001,0,0.003,0,0.005,0c11.771,0,21.347-9.576,21.347-21.35c0-5.283-1.929-10.125-5.119-13.857
		c3.19-3.732,5.119-8.574,5.119-13.855C239.186,82.105,229.61,72.527,217.841,72.527z"
          />
          <path
            d="M65.31,72.527c-4.14,0-7.496,3.355-7.496,7.496v55.424c0,4.139,3.356,7.494,7.496,7.494c4.139,0,7.495-3.355,7.495-7.494
		V80.023C72.805,75.883,69.448,72.527,65.31,72.527z"
          />
          <path
            d="M108.174,102.709h-4.218v-5.1c0-4.139-3.355-7.494-7.495-7.494c-4.139,0-7.495,3.356-7.495,7.494v5.1h-4.215
		c-4.14,0-7.495,3.355-7.495,7.496c0,4.139,3.355,7.494,7.495,7.494h4.215v5.098c0,4.141,3.357,7.496,7.495,7.496
		c4.14,0,7.495-3.355,7.495-7.496v-5.098h4.218c4.139,0,7.495-3.355,7.495-7.494C115.669,106.064,112.313,102.709,108.174,102.709z"
          />
          <path
            d="M189.739,95.961h-19.5c-4.14,0-7.495,3.355-7.495,7.494c0,4.141,3.355,7.496,7.495,7.496h19.5
		c4.14,0,7.495-3.355,7.495-7.496C197.234,99.316,193.879,95.961,189.739,95.961z"
          />
          <path
            d="M189.739,113.109h-19.5c-4.14,0-7.495,3.355-7.495,7.496c0,4.139,3.355,7.494,7.495,7.494h19.5
		c4.14,0,7.495-3.355,7.495-7.494C197.234,116.465,193.879,113.109,189.739,113.109z"
          />
        </g>
      </svg>
    ),
    close: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-x-circle"
        viewBox="0 0 16 16"
      >
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
      </svg>
    ),
    check: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-check2-circle"
        viewBox="0 0 16 16"
      >
        <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0" />
        <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z" />
      </svg>
    ),
    failed: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-person-exclamation"
        viewBox="0 0 16 16"
      >
        <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m.256 7a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z" />
        <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-3.5-2a.5.5 0 0 0-.5.5v1.5a.5.5 0 0 0 1 0V11a.5.5 0 0 0-.5-.5m0 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1" />
      </svg>
    )
  }

  return icons[name] || null
}
