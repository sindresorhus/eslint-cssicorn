import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const base = 'border: 1px solid red';
const override = 'border: 1px solid blue';
const flat = (first, second) => `${first} { ${base}; } ${second} { ${override}; }`;
const nested = selector => `.button { ${base}; ${selector} { ${override}; } }`;

test({
	valid: [
		'.button { border: 1px solid red; }',
		'.button { border: 1px solid red; &:hover { border-color: blue; } }',
		'.button { border: 1px solid red; &:hover { border: 1px solid red; } }',
		'.button { border: 1px solid red; &:hover { border: 2px dashed blue; } }',
		...[
			'.button2:hover',
			'.active.button',
			'.theme .button',
			'.button .icon',
			'.button > .icon',
			'.button + .button',
			'.button::before',
			'.button:before',
			'.button:after',
			'.button:unknown',
		].map(selector => flat('.button', selector)),
		...[
			':hover', '& .icon', '& > .icon', '& + &', '.theme &', ':is(&):hover', '&:is(&)', '&&:hover', '&:hover&', '&::before', '&:before', '&',
		].map(selector => nested(selector)),
		flat('.toolbar > .button', '.toolbar .button:hover'),
		flat('.button', '.button:hover, .link:hover'),
		flat('.button::before', '.button::before:hover'),
		`.button:hover { ${override}; } .button { ${base}; }`,
		`.button { &:hover { ${override}; } ${base}; }`,
		`@media (width > 1px) { .button { ${base}; } } @media (width > 1px) { .button:hover { ${override}; } }`,
		`.button { ${base}; } @media (width > 1px) { .button:hover { ${override}; } }`,
		`.button { ${base}; @media (width > 1px) { &:hover { ${override}; } } }`,
		`.button { ${base}; } .button.active { border: 2px dashed red; } .button.active:hover { ${override}; }`,
		`.button { ${base}; } .button { border-width: 2px; } .button:hover { ${override}; }`,
		`.button { ${base}; } .button.active { border-width: 2px; } .button.active:hover { ${override}; }`,
		`.button { ${base}; } .button:hover { border-width: 2px; } .button:hover { ${override}; }`,
		`.button { ${base}; &:hover { border-width: 2px; } &:hover { ${override}; } }`,
		`.button { ${base}; } .link { ${base}; } .button:hover, .link:hover { ${override}; }`,
		...['border-width: 2px', 'border-left-width: 2px', 'border-inline-width: 2px', 'border-image: none', 'all: initial', base].flatMap(extra => [
			`.button { ${base}; ${extra}; &:hover { ${override}; } }`,
			`.button { ${base}; &:hover { ${override}; ${extra}; } }`,
		]),
		`.button { ${base} !important; &:hover { ${override}; } }`,
		`.button { ${base}; &:hover { ${override} !important; } }`,
		'.button { border: var(--border); &:hover { border: 1px solid blue; } }',
		'.button { border: 1px solid red; &:hover { border: var(--border); } }',
		'.button { border: initial; &:hover { border: 1px solid blue; } }',
		'.button { border: 1px solid red; &:hover { border: solid blue; } }',
		'.button { border: random(1px, 2px) solid red; &:hover { border: 1px solid blue; } }',
		'.button { --border: 1px solid red; &:hover { --border: 1px solid blue; } }',
		'.button { -webkit-transition: opacity 1s; &:hover { -webkit-transition: opacity 2s; } }',
		'.button { font: menu; &:hover { font: caption; } }',
		'.button { outline: 1px auto; &:hover { outline: 2px auto; } }',
		'.button { background: url(a), url(b); &:hover { background: url(c); } }',
		'.button { animation: spin 1s; &:hover { animation: Spin 2s; } }',
		'.button { font: 16px Arial; &:hover { font: 18px arial; } }',
		'.button { transition: --Color 1s; &:hover { transition: --color 2s; } }',
		'@keyframes spin { from { border: 1px solid red; } to { border: 1px solid blue; } }',
	],
	invalid: [
		...[
			nested('&:hover'),
			nested('&.active'),
			nested('&[disabled]'),
			nested('&#active'),
			nested('&:is(:hover, :focus)'),
			nested('&:hover, &:focus'),
			flat('.button', '.button:hover'),
			flat('.button', '.button.active'),
			flat('.button', '.button[disabled]'),
			flat('.button', '.button#active'),
			flat('.button', '.button:not([disabled])'),
			flat(String.raw`.button\:large`, String.raw`.button\:large:hover`),
			flat('.toolbar > .button', '.toolbar > .button:hover'),
			flat('.button', '.button:hover, .button:focus'),
			flat('.button, .link', '.button:hover, .link:hover'),
			flat('.button, .button.active', '.button.active:hover'),
			...['layer components', 'media (width > 1px)', 'supports (display: grid)', 'container (width > 1px)', 'scope (.card)'].map(group => `@${group} { ${flat('.button', '.button:hover')} }`),
			`.button { ${base}; border-radius: 4px; &:hover { ${override}; } }`,
			`.button { ${base}; } .unrelated { border-width: 2px; } .button:hover { ${override}; }`,
			`.button { ${base} !important; &:hover { ${override} !IMPORTANT; } }`,
			`.button { ${base}; &:hover { /* retain */ ${override}; } }`,
			'.button { border: 1px SOLID RED; &:hover { border: blue 1PX solid; } }',
			'.button {\r\n    border: 1px solid red !important;\r\n    &:hover {\r\n        border : 1px solid blue !important;\r\n    }\r\n}',
		].map(code => ({
			code,
			errors: [{
				messageId: 'prefer-longhand-overrides',
				data: {property: 'border', component: 'border-color'},
				suggestions: [{
					messageId: 'prefer-longhand-overrides/suggestion',
					output: code.replace(/border\s*:\s*(?:1px solid blue|blue 1PX solid)/v, match => match.startsWith('border :') ? 'border-color : blue' : 'border-color: blue'),
				}],
			}],
		})),
		...[
			['border: 1px solid red', 'border: 2px solid red', 'border-width: 2px'],
			['border: 1px solid red', 'border: 1px dashed red', 'border-style: dashed'],
			['border: solid red', 'border: solid blue', 'border-color: blue'],
			['BORDER: 1px SOLID RED', 'BORDER: 1PX solid blue', 'border-color: blue'],
			['outline: 1px solid red; outline-offset: 2px', 'outline: 1px solid blue', 'outline-color: blue'],
			['margin: 1px 2px 3px 4px', 'margin: 1px 2px 3px 5px', 'margin-left: 5px'],
			['border-width: 1px 2px 3px', 'border-width: 1px 2px 3px 4px', 'border-left-width: 4px'],
			['gap: 1rem', 'gap: 1rem 2rem', 'column-gap: 2rem'],
			['grid-area: 1 / 2 / 3 / 4', 'grid-area: 1 / 2 / 3', 'grid-column-end: auto'],
			['font: 16px/1.5 Arial, serif', 'font: bold 16px/1.5 Arial, serif', 'font-weight: bold'],
			['font: 16px Arial, serif', 'font: 16px Inter, sans-serif', 'font-family: Inter, sans-serif'],
			['font: 16px "/* Old Face */"', 'font: 16px "/* New Face */"', 'font-family: "/* New Face */"'],
			['list-style: none inside', 'list-style: none outside', 'list-style-position: outside'],
			['background: url(a) center/cover no-repeat red', 'background: url(a) center/cover no-repeat blue', 'background-color: blue'],
			['background: url(a) left top, url(b) right bottom', 'background: url(a) center, url(b) right bottom', 'background-position: center, right bottom'],
			['animation: spin 1s, Fade 2s', 'animation: spin 3s, Fade 2s', 'animation-duration: 3s, 2s'],
			['animation: spin 1s,\r\n    Fade 2s', 'animation: spin 3s,\r\n    Fade 2s', 'animation-duration: 3s,\r\n    2s'],
			['animation: spin 1s', 'animation: Spin 1s', 'animation-name: Spin'],
			['transition: opacity 1s ease 2s', 'transition: opacity 3s ease 2s', 'transition-duration: 3s'],
		].map(([first, second, result]) => {
			const code = `.button { ${first}; &:hover { ${second}; } }`;
			return {
				code,
				errors: [{
					messageId: 'prefer-longhand-overrides',
					suggestions: [{
						messageId: 'prefer-longhand-overrides/suggestion',
						output: `.button { ${first}; &:hover { ${result}; } }`,
					}],
				}],
			};
		}),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'.button { border: 1px solid red; &:hover { border: 1px /* retain */ solid blue; } }',
		'.button { border: 1px solid red; &:hover { border /* retain */: 1px solid blue; } }',
	],
});
