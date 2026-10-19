"Python ``slice`` type.

``slice(stop)``                  -> start=None, stop=stop, step=None
``slice(start, stop)``           -> step=None
``slice(start, stop, step)``     -> all explicit

Any of the three fields may be ``None`` (Python None), meaning
""default for direction"".  Used by Python sequence subscript
expressions (`xs[a:b:c]` evaluates to a slice instance) and by
``isinstance(x, slice)`` checks in user code that overrides
``__getitem__`` to handle slices directly.

Instance variables:
  start - the start index (int or None)
  stop  - the stop index (int or None)
  step  - the step value (int or None, must be non-zero if int)

"
Class {
	#name : 'slice',
	#superclass : 'object',
	#category : 'Numbers'
}

{ #category : 'Instance Creation' }
slice class >> ___newStart: aStart stop: aStop step: aStep [
	"env-0 entry point used by codegen for SliceAst when we eventually
	emit slice instances for receivers that override __getitem__.
	Phase B+1: stores start/stop/step into dynamic-instVar storage so
	``slice(1,10,2).start'' Python attribute reads find the values
	directly via the ___pyAttrLoad___ dynamic probe."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #start put: aStart.
	inst dynamicInstVarAt: #stop put: aStop.
	inst dynamicInstVarAt: #step put: aStep.
	^ inst

]

{ #category : 'Grail-Python Attribute Hook' }
slice class >> ___pythonValueAttrs___ [
	"start, stop and step are VALUE attributes: a Python read performs the
	accessor, which answers None for an omitted bound.  A slice made by
	slice(...) stores None and was always read correctly; one made by
	codegen stores nil, and a read of it answered the accessor itself.

	A literal, not a fresh set: ___pyAttrLoad___ asks on every slice read."

	^ #(#'start' #'stop' #'step')

]
