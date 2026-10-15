"The object returned by pattern.scanner(string[, pos[, endpos]]): a stateful
cursor whose match()/search() return successive SreMatch objects (or None),
advancing an internal position.  A real C SRE_Scanner cannot be kept across
shim calls (its SRE_STATE points into the per-call UCS4 buffer cache), so this
reuses SrePattern>>___searchFrom___:in:to:mustAdvance: -- the same one-shot
primitive finditer uses -- with must_advance semantics after a zero-width
match."
Class {
	#name : 'SreScanner',
	#superclass : 'Object',
	#instVars : [
		'pattern',
		'string',
		'cursor',
		'endpos',
		'mustAdvance'
	]
}
