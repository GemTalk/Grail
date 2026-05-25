! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- slice class (Python 'slice' type)
expectvalue /Class
doit
object subclass: 'slice'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
slice comment:
'Python ``slice`` type.

``slice(stop)``                  -> start=None, stop=stop, step=None
``slice(start, stop)``           -> step=None
``slice(start, stop, step)``     -> all explicit

Any of the three fields may be ``None`` (Python None), meaning
"default for direction".  Used by Python sequence subscript
expressions (`xs[a:b:c]` evaluates to a slice instance) and by
``isinstance(x, slice)`` checks in user code that overrides
``__getitem__`` to handle slices directly.

Instance variables:
  start - the start index (int or None)
  stop  - the stop index (int or None)
  step  - the step value (int or None, must be non-zero if int)
'
%

expectvalue /Class
doit
slice category: 'Numbers'
%

! ------------------- Remove existing Python methods from slice
expectvalue /Metaclass3
doit
slice removeAllMethods.
slice class removeAllMethods.
slice removeAllMethods: 1.
slice class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction
! ===============================================================================

category: 'Instance Creation'
classmethod: slice
___newStart: aStart stop: aStop step: aStep
	"env-0 entry point used by codegen for SliceAst when we eventually
	emit slice instances for receivers that override __getitem__.
	Phase B+1: stores start/stop/step into dynamic-instVar storage so
	``slice(1,10,2).start'' Python attribute reads find the values
	directly via the ___pyAttrLoad___ dynamic probe."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #start put: aStart.
	inst @env0:dynamicInstVarAt: #stop put: aStop.
	inst @env0:dynamicInstVarAt: #step put: aStep.
	^ inst
%

set compile_env: 1

category: 'Python-Initialization'
classmethod: slice
__new__: stop
	"slice(stop)  -> slice(None, stop, None)"

	^ slice @env0:___newStart: None stop: stop step: None
%

category: 'Python-Initialization'
classmethod: slice
__new__: start _: stop
	"slice(start, stop)  -> slice(start, stop, None)"

	^ slice @env0:___newStart: start stop: stop step: None
%

category: 'Python-Initialization'
classmethod: slice
__new__: start _: stop _: step
	"slice(start, stop, step)"

	^ slice @env0:___newStart: start stop: stop step: step
%

set compile_env: 1

! ===============================================================================
! Instance methods - accessors (env-1 so Python attribute syntax works)
! ===============================================================================

category: 'Python-Attribute Access'
method: slice
start
	^ self @env0:dynamicInstVarAt: #start
%

category: 'Python-Attribute Access'
method: slice
stop
	^ self @env0:dynamicInstVarAt: #stop
%

category: 'Python-Attribute Access'
method: slice
step
	^ self @env0:dynamicInstVarAt: #step
%

! ===============================================================================
! Instance methods - Python protocol
! ===============================================================================

category: 'Python-Conversion'
method: slice
__repr__
	"Mirror CPython's slice repr: slice(<start>, <stop>, <step>)."

	| sep |
	sep := ', '.
	^ ('slice(' @env0:,
		(self start @env1:__repr__) @env0:, sep @env0:,
		(self stop @env1:__repr__) @env0:, sep @env0:,
		(self step @env1:__repr__)) @env0:, ')'
%

category: 'Python-Conversion'
method: slice
__str__
	^ self @env1:__repr__
%

category: 'Python-Comparison'
method: slice
__eq__: other
	"Two slices are equal iff their (start, stop, step) tuples are
	equal under Python equality rules."

	(other @env0:isKindOf: slice) ifFalse: [^ false].
	^ ((self start = other @env1:start)
		and: [self stop = other @env1:stop])
		and: [self step = other @env1:step]
%

category: 'Python-Methods'
method: slice
indices: length
	"slice.indices(length) -> (start, stop, step).
	Normalizes self against a sequence of the given length, returning a
	3-tuple that can drive a plain `for i in range(...)` loop.  Matches
	CPython's PySlice_GetIndicesEx semantics including negative-index
	wrap and bounds clamping."

	| st lo hi |
	st := self step @env0:= None ifTrue: [1] ifFalse: [self step].
	(st @env0:= 0) ifTrue: [
		ValueError ___signal___: 'slice step cannot be zero'
	].
	lo := self start @env0:= None
		ifTrue: [st @env0:> 0 ifTrue: [0] ifFalse: [length @env0:- 1]]
		ifFalse: [self start @env0:< 0
			ifTrue: [(length @env0:+ self start) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [self start @env0:min:
				(st @env0:> 0 ifTrue: [length] ifFalse: [length @env0:- 1])]].
	hi := self stop @env0:= None
		ifTrue: [st @env0:> 0 ifTrue: [length] ifFalse: [-1]]
		ifFalse: [self stop @env0:< 0
			ifTrue: [(length @env0:+ self stop) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [self stop @env0:min:
				(st @env0:> 0 ifTrue: [length] ifFalse: [length @env0:- 1])]].
	^ tuple @env0:with: lo with: hi with: st
%

set compile_env: 0
