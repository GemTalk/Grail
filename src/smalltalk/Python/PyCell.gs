! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyCell class (Python 'cell' object -- an element of func.__closure__)
expectvalue /Class
doit
object subclass: 'PyCell'
  instVarNames: #( reader setter holder )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyCell comment:
'Python cell object -- one element of ``func.__closure__``.

A cell is the box CPython puts a closed-over variable in, so that the defining
scope and every nested function share ONE binding rather than a copy.  Grail
has no such box: a free variable is read straight off the enclosing Smalltalk
block''s temp, which gets the same sharing for free and is why closures worked
long before this class existed.  What did not exist was any way to NAME that
binding as an object, which is what ``__closure__`` hands back.

So a PyCell holds the pair of blocks Grail already uses elsewhere to pass a
binding by reference (ClassDefAst''s ``___cell_<name>___`` reader and
``___cellSetter_<name>___`` writer): a zero-arg ``[x]`` that reads the
enclosing temp and a one-arg ``[:v | x := v]`` that writes it.  Smalltalk
blocks capture by reference, so ``cell_contents`` is LIVE -- it reports the
current value of the variable, and assigning it writes the binding the
enclosing scope and every sibling closure see.

STANDALONE CELLS.  ``types.CellType(v)`` builds a cell that closes over
nothing, so there is no enclosing binding for the reader/writer pair to reach.
Those cells get a one-slot ``holder`` Array and read/write that instead, which
is also what makes them the only cells that can be EMPTIED: ``del
c.cell_contents`` stores the empty marker in the holder.  A closure cell refuses
the delete rather than writing the marker through to the enclosing variable,
which would leave the defining scope reading a sentinel object instead of
raising -- see __delattr__.

KNOWN DEVIATION, and it is not the one this comment used to claim.  Two
observations:

  * CPython gives sibling closures over one variable the SAME cell, so
    ``g.__closure__[0] is h.__closure__[0]`` is true when g and h both close
    over x.  Grail emits a fresh PyCell per def, so that answers False.
  * Worse, and the reverse of what was documented here: two evaluations of ONE
    def share a cell, so ``mkf(1).__closure__[0] is mkf(2).__closure__[0]`` is
    true and the second reads 1.  The def-site stamp goes through
    ExecBlockAttrs>>staticSlotAt:attr:put:, which is keyed by ``aBlock method''
    and skips a repeat write; that is correct for __name__/__doc__ (constant per
    def) but not for cells, which capture a particular activation.

Only the REFLECTION is affected -- calling the closures gives CPython''s answers,
because the body reads the Smalltalk temp directly rather than going through the
cell.  The fix is per-function-object storage, which is exactly what the
staticSlotTable exists to avoid: its comment records a measured ``VM temporary
object memory is full'' at ~100k def evaluations, since no weak-keyed collection
is available in this GemStone.  So this needs weak storage, not a change here.
'
%

expectvalue /Class
doit
PyCell category: 'Grail-Functions'
%

! ------------------- Remove existing methods from PyCell
expectvalue /Metaclass3
doit
PyCell removeAllMethods.
PyCell class removeAllMethods.
PyCell removeAllMethods: 1.
PyCell class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0; called by codegen)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyCell
reader: aZeroArgBlock setter: aOneArgBlockOrNil
	"Build a cell over a binding, given the reader/writer block pair the def
	site emits.  aOneArgBlockOrNil is nil for a binding codegen cannot assign
	(the free variable of a def whose enclosing scope is not a plain block),
	which makes the cell read-only rather than unusable."

	| inst |
	inst := self new.
	inst ___setReader___: aZeroArgBlock setter: aOneArgBlockOrNil.
	^ inst
%

category: 'Instance Creation'
classmethod: PyCell
reader: aZeroArgBlock
	"A read-only cell -- no writer block."

	^ self reader: aZeroArgBlock setter: nil
%

! ===============================================================================
! Instance methods (env 0)
! ===============================================================================

category: 'Grail-private'
method: PyCell
___setReader___: aZeroArgBlock setter: aOneArgBlockOrNil

	reader := aZeroArgBlock.
	setter := aOneArgBlockOrNil.
%

category: 'Grail-private'
method: PyCell
___reader___

	^ reader
%

category: 'Grail-private'
method: PyCell
___setter___

	^ setter
%

set compile_env: 1

! ===============================================================================
! Python-visible behavior (env 1)
! ===============================================================================

category: 'Grail-Attribute Access'
method: PyCell
cell_contents
	"``cell.cell_contents'' -- the CURRENT value of the closed-over binding.

	Evaluates the reader block, so this tracks assignments made after the cell
	was built, which is the whole point of a cell.  #'cell_contents' is in
	___pythonValueAttrs___ so a read answers the value rather than a
	BoundMethod wrapping this selector."

	| r v |
	r := self @env0:___reader___.
	r @env0:isNil ifTrue: [
		^ ValueError ___signal___: 'Cell is empty'].
	v := r @env0:value.
	"A STANDALONE cell (types.CellType()) is empty by holding the marker, not by
	having no reader -- and the marker must not be allowed to escape into Python,
	where it would read as some ordinary object rather than raising."
	(v @env0:== (PyCell @env0:___emptyMarker___)) ifTrue: [
		^ ValueError ___signal___: 'Cell is empty'].
	^ v
%

category: 'Grail-Attribute Access'
method: PyCell
___setCellContents___: aValue
	"Backing for ``cell.cell_contents = value'' -- writes THROUGH to the
	enclosing binding via the setter block, so the defining scope and every
	other closure over that variable observe the new value."

	| s |
	s := self @env0:___setter___.
	s @env0:isNil ifTrue: [
		^ AttributeError ___signal___: 'readonly attribute'].
	s @env0:value: aValue.
	^ None
%

category: 'Grail-Printing'
method: PyCell
__repr__
	"``<cell at 0xADDR: EMPTY>'' / ``<cell at 0xADDR: TYPE object at 0xADDR>'',
	shaped like CPython's.  Nothing conformance-critical reads this."

	| stream r contents typeName |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<cell at 0x'.
	stream @env0:nextPutAll:
		(self @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase.
	stream @env0:nextPutAll: ': '.
	r := self @env0:___reader___.
	r @env0:isNil
		ifTrue: [stream @env0:nextPutAll: 'empty']
		ifFalse: [
			contents := r @env0:value.
			(contents @env0:== (PyCell @env0:___emptyMarker___))
				ifTrue: [contents := nil].
			contents @env0:isNil
				ifTrue: [stream @env0:nextPutAll: 'empty']
				ifFalse: [
					"The PYTHON type name (``int''), not the Smalltalk class
					(``SmallInteger'') -- same __qualname__-with-fallback read
					Object >> __repr__ uses, and a repr must not raise.  Bound to
					a temp first: written inline, the ``on:do:'' would be
					swallowed into a ``nextPutAll:on:do:'' selector."
					typeName := [ | qn |
						qn := contents @env0:class @env1:___pyAttrLoad___: #'__qualname__'.
						(qn isKindOf: CharacterCollection)
							ifTrue: [qn @env0:asString]
							ifFalse: [contents @env0:class @env0:name @env0:asString] ]
						@env0:on: AbstractException
						do: [:e | e @env0:return: contents @env0:class @env0:name @env0:asString].
					stream @env0:nextPutAll: typeName.
					stream @env0:nextPutAll: ' object at 0x'.
					stream @env0:nextPutAll:
						(contents @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase]].
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

! ___pythonValueAttrs___ MUST be compiled in env 0, and on the CLASS side:
! object>>___pyAttrLoad___ consults it through an env-0 ``respondsTo:'', which
! never sees an env-1 method (same requirement called out in Bool.gs, Bytes.gs
! and LruCacheWrapper.gs).  Filed in env 1 it compiles and is simply ignored,
! and ``cell.cell_contents'' answers a BoundMethod instead of the value.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PyCell
___pythonValueAttrs___
	"``cell_contents'' is a VALUE attribute, not a callable: reading it must
	evaluate the accessor rather than hand back a BoundMethod wrapping it."

	^ IdentitySet new
		add: #'cell_contents';
		yourself
%

set compile_env: 0

! ============================================================================
! Standalone cells -- ``types.CellType(v)'' / ``types.CellType()''
! ============================================================================

category: 'Instance Creation'
classmethod: PyCell
___emptyMarker___
	"The unique object stored in a standalone cell's holder to mean EMPTY.

	A distinct marker rather than nil, because nil is a value a cell may
	legitimately hold: ``types.CellType(None)'' is a full cell whose contents are
	None, and CPython distinguishes that from an empty one (the first answers
	None, the second raises ValueError).  Session-local and canonical, so ``==''
	identifies it."

	^ SessionTemps current
		at: #'___PyCellEmptyMarker___'
		ifAbsentPut: [Array new: 0]
%

category: 'Instance Creation'
classmethod: PyCell
___standaloneHolding___: aValueOrMarker
	"A cell that closes over NOTHING -- the ``types.CellType(...)'' shape.

	There is no enclosing binding for the reader/writer pair to reach, so it is
	built over a private one-slot Array instead.  Reusing the same pair the
	closure case uses means cell_contents, the setter and __repr__ need no
	standalone branch; only deletion does, and that is what ``holder'' records."

	| h cell |
	h := Array new: 1.
	h at: 1 put: aValueOrMarker.
	cell := self reader: [h at: 1] setter: [:v | h at: 1 put: v].
	cell ___setHolder___: h.
	^ cell
%

category: 'Grail-private'
method: PyCell
___setHolder___: anArray
	holder := anArray
%

category: 'Grail-private'
method: PyCell
___holder___
	^ holder
%

category: 'Grail-private'
method: PyCell
___isEmpty___
	"Is this cell empty?  Two ways to be: no reader at all (a cell built over a
	binding that was never assignable) or a holder carrying the empty marker."

	| r |
	r := self ___reader___.
	r isNil ifTrue: [^ true].
	^ r value == PyCell ___emptyMarker___
%

set compile_env: 1

! ============================================================================
! Instance creation -- must be ENV 1
! ============================================================================
!
! ``object class >> value:value:'' dispatches a Python call by arity and sends
! __new__ / __new__: in env 1.  Filed in the env-0 region beside the helpers
! these methods compile fine and are simply never found: the send lands on the
! generic ``Object class >> __new__:'' instead, which tried ``1 new'' and failed
! with a Smalltalk MessageNotUnderstood rather than any Python error.

category: 'Instance Creation'
classmethod: PyCell
__new__
	"``types.CellType()'' -- a new EMPTY cell.

	A classmethod named __new__ rather than an __init__: PyCell is
	Smalltalk-defined, so calling it lands in ``object class >> value:...'',
	which dispatches on arity to __new__ on the metaclass and never consults
	__init__."

	^ self @env0:___standaloneHolding___: (PyCell @env0:___emptyMarker___)
%

category: 'Instance Creation'
classmethod: PyCell
__new__: aValue
	"``types.CellType(v)'' -- a new cell holding v."

	^ self @env0:___standaloneHolding___: aValue
%

! ============================================================================
! Comparison -- CPython orders cells by contents, empty before everything
! ============================================================================

category: 'Grail-Comparison'
method: PyCell
___emptyPairWith___: other
	"The pair (self empty?, other empty?), or nil when ``other'' is not a cell.

	CPython's cell_richcompare sorts an empty cell BEFORE every filled one and
	otherwise defers entirely to the contents -- which is why
	``cell(-36) == cell(-36.0)'' is true: that is int/float equality, nothing
	cell-specific.  Answering nil lets each comparison hand back NotImplemented
	so Python can try the reflected operation."

	(other @env0:isKindOf: PyCell) @env0:not ifTrue: [^ nil].
	^ { self @env0:___isEmpty___. other @env0:___isEmpty___ }
%

category: 'Grail-Comparison'
method: PyCell
__eq__: other
	| k |
	k := self ___emptyPairWith___: other.
	k @env0:isNil ifTrue: [^ NotImplemented].
	((k @env0:at: 1) @env0:or: [k @env0:at: 2])
		ifTrue: [^ (k @env0:at: 1) @env0:= (k @env0:at: 2)].
	^ self cell_contents @env1:__eq__: other cell_contents
%

category: 'Grail-Comparison'
method: PyCell
__lt__: other
	| k |
	k := self ___emptyPairWith___: other.
	k @env0:isNil ifTrue: [^ NotImplemented].
	(k @env0:at: 1) ifTrue: [^ (k @env0:at: 2) @env0:not].
	(k @env0:at: 2) ifTrue: [^ false].
	^ self cell_contents @env1:__lt__: other cell_contents
%

category: 'Grail-Comparison'
method: PyCell
__gt__: other
	| k |
	k := self ___emptyPairWith___: other.
	k @env0:isNil ifTrue: [^ NotImplemented].
	(k @env0:at: 2) ifTrue: [^ (k @env0:at: 1) @env0:not].
	(k @env0:at: 1) ifTrue: [^ false].
	^ self cell_contents @env1:__gt__: other cell_contents
%

category: 'Grail-Comparison'
method: PyCell
__ne__: other
	| e |
	e := self @env1:__eq__: other.
	(e @env0:== NotImplemented) ifTrue: [^ NotImplemented].
	^ (e @env1:__bool__) @env0:not
%

category: 'Grail-Comparison'
method: PyCell
__le__: other
	| g |
	g := self @env1:__gt__: other.
	(g @env0:== NotImplemented) ifTrue: [^ NotImplemented].
	^ (g @env1:__bool__) @env0:not
%

category: 'Grail-Comparison'
method: PyCell
__ge__: other
	| l |
	l := self @env1:__lt__: other.
	(l @env0:== NotImplemented) ifTrue: [^ NotImplemented].
	^ (l @env1:__bool__) @env0:not
%

! ============================================================================
! Attribute hooks -- cell_contents is writable, and deletable when standalone
! ============================================================================

category: 'Grail-Attribute Access'
method: PyCell
__setattr__: aName _: aValue
	"``c.cell_contents = v''.  Without this the assignment fell through to the
	generic object path and created a DYNAMIC INSTVAR shadowing the accessor, so
	the write appeared to succeed while the next read still answered the old
	value -- test_funcattrs' test_set_cell saw ``12 != 9''.  Every other name is
	refused: CPython's cell has no other writable attribute."

	(aName @env0:asString @env0:= 'cell_contents')
		ifTrue: [^ self ___setCellContents___: aValue].
	^ AttributeError ___signal___:
		('cell object has no attribute ' , aName @env0:asString)
%

category: 'Grail-Attribute Access'
method: PyCell
__delattr__: aName
	"``del c.cell_contents'' -- empties the cell.

	Only a STANDALONE cell can be emptied.  A closure cell's writer reaches the
	enclosing Smalltalk temp, and storing the empty marker there would leave the
	defining scope and every sibling closure reading a SENTINEL OBJECT instead of
	raising -- turning a clean ValueError into a value that propagates silently.
	Grail cannot unbind a Smalltalk temp, so refusing is the honest answer.

	(CPython does empty a closure cell, and test_set_cell then asserts the
	enclosing name raises NameError / UnboundLocalError.  That half needs
	unbindable bindings, not a change here.)"

	(aName @env0:asString @env0:= 'cell_contents') @env0:not ifTrue: [
		^ AttributeError ___signal___:
			('cell object has no attribute ' , aName @env0:asString)].
	(self @env0:___holder___) @env0:isNil ifTrue: [
		^ ValueError ___signal___:
			'cannot clear a closure cell: it would unbind the enclosing variable'].
	(self @env0:___holder___) @env0:at: 1 put: (PyCell @env0:___emptyMarker___).
	^ None
%

set compile_env: 1

! Leave the compiler in env 0: the next file filed by install.gs opens with a
! class-definition doit, which only ``Object class'' understands in env 0.
set compile_env: 0
