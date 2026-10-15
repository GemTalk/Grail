"Python cell object -- one element of ``func.__closure__``.

A cell is the box CPython puts a closed-over variable in, so that the defining
scope and every nested function share ONE binding rather than a copy.  Grail
has no such box: a free variable is read straight off the enclosing Smalltalk
block's temp, which gets the same sharing for free and is why closures worked
long before this class existed.  What did not exist was any way to NAME that
binding as an object, which is what ``__closure__`` hands back.

So a PyCell holds the pair of blocks Grail already uses elsewhere to pass a
binding by reference (ClassDefAst's ``___cell_<name>___`` reader and
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
  * Two evaluations of ONE def USED TO share a cell, so
    ``mkf(1).__closure__[0] is mkf(2).__closure__[0]`` was true and the second
    read 1.  FIXED, and not by finding weak storage: ``__closure__`` is no
    longer served from the def-site stamp at all.  ExecBlockAttrs builds the
    cells ON DEMAND over the function's own ``staticLink`` -- the enclosing
    activation's VariableContext -- so two evaluations address two different
    contexts and each reports its own values.  Nothing per-activation has to be
    retained, which is why the earlier ""this needs weak storage"" reading was the
    wrong conclusion: the state was never ours to store, it was on the function
    object all along.  See ExecBlockAttrs class>>___closureFor___:.

Only the REFLECTION was ever affected -- calling the closures always gave
CPython's answers, because the body reads the Smalltalk temp directly rather
than going through the cell.

"
Class {
	#name : 'PyCell',
	#superclass : 'object',
	#instVars : [
		'reader',
		'setter',
		'holder',
		'emptier'
	],
	#category : 'Grail-Functions'
}

{ #category : 'Instance Creation' }
PyCell class >> ___emptyMarker___ [
	"The unique object stored in a standalone cell's holder to mean EMPTY.

	A distinct marker rather than nil, because nil is a value a cell may
	legitimately hold: ``types.CellType(None)'' is a full cell whose contents are
	None, and CPython distinguishes that from an empty one (the first answers
	None, the second raises ValueError).  Session-local and canonical, so ``==''
	identifies it."

	^ SessionTemps current
		at: #'___PyCellEmptyMarker___'
		ifAbsentPut: [Array new: 0]

]

{ #category : 'Instance Creation' }
PyCell class >> ___overContext___: aVariableContext slot: anIndex [
	"A cell over a live BINDING, addressed by its slot in the VariableContext
	the enclosing activation captured its temps into.

	This is what ``func.__closure__'' hands back, and it is built ON DEMAND
	from the function object rather than stored: ``aBlock staticLink'' is the
	enclosing activation's own context, so two evaluations of one def address
	two different contexts and report their own values.  The def-time stamp
	could not do that -- it is keyed by def SITE and skips repeat writes, so
	every later evaluation reported the first one's cells.

	nil in the slot means the binding is not assigned yet, which is exactly
	CPython's EMPTY cell, so the reader answers the empty marker and every
	caller's existing marker handling applies unchanged.  A Python None is a
	distinct object, so the two never collide.

	The setter and the emptier write the slot directly (``_at:put:'', because
	VariableContext deliberately does not implement ``at:put:''), which is what
	makes a closure cell WRITABLE: ``c.cell_contents = 9'' changes the binding
	the defining scope and every sibling closure read, and deleting it unbinds
	the variable so the next read raises."

	| inst |
	inst := self
		reader: [ | v |
			v := aVariableContext at: anIndex.
			v isNil ifTrue: [PyCell ___emptyMarker___] ifFalse: [v] ]
		setter: [:v | aVariableContext _at: anIndex put: v].
	inst ___setEmptier___: [aVariableContext _at: anIndex put: nil].
	^ inst

]

{ #category : 'Grail-Python Attribute Hook' }
PyCell class >> ___pythonValueAttrs___ [
	"``cell_contents'' is a VALUE attribute, not a callable: reading it must
	evaluate the accessor rather than hand back a BoundMethod wrapping it."

	^ IdentitySet new
		add: #'cell_contents';
		yourself

]

{ #category : 'Instance Creation' }
PyCell class >> ___standaloneHolding___: aValueOrMarker [
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
	cell ___setEmptier___: [h at: 1 put: (PyCell ___emptyMarker___)].
	^ cell

]

{ #category : 'Instance Creation' }
PyCell class >> reader: aZeroArgBlock [
	"A read-only cell -- no writer block."

	^ self reader: aZeroArgBlock setter: nil

]

{ #category : 'Instance Creation' }
PyCell class >> reader: aZeroArgBlock setter: aOneArgBlockOrNil [
	"Build a cell over a binding, given the reader/writer block pair the def
	site emits.  aOneArgBlockOrNil is nil for a binding codegen cannot assign
	(the free variable of a def whose enclosing scope is not a plain block),
	which makes the cell read-only rather than unusable."

	| inst |
	inst := self new.
	inst ___setReader___: aZeroArgBlock setter: aOneArgBlockOrNil.
	^ inst

]

{ #category : 'Grail-private' }
PyCell >> ___emptier___ [
	"A zero-arg block that empties this cell, or nil when it cannot be emptied."

	^ emptier

]

{ #category : 'Grail-private' }
PyCell >> ___holder___ [
	^ holder

]

{ #category : 'Grail-private' }
PyCell >> ___isEmpty___ [
	"Is this cell empty?  See ___readOrMarker___ for the three ways to be."

	^ self ___readOrMarker___ == PyCell ___emptyMarker___

]

{ #category : 'Grail-private' }
PyCell >> ___reader___ [

	^ reader

]

{ #category : 'Grail-private' }
PyCell >> ___readOrMarker___ [
	"The cell's contents, or the empty marker when it has none.

	THREE ways for a cell to be empty, and only two of them used to be
	recognised: no reader at all, a holder carrying the marker, and -- the one
	missing -- a CLOSURE cell over a binding that has not been assigned yet.

	``def f(): print(a)'' followed by ``f.__closure__[0]'' before ``a = 12'' is
	precisely CPython's empty cell, and it is the shape test_funcattrs uses to
	build one.  Grail compiles the reader as an ordinary local read, so
	evaluating it raised UnboundLocalError -- which then escaped from
	``cell_contents'' (CPython raises ValueError there), from ``repr'' (which
	must never raise at all) and from every comparison, because each of those
	has to ask whether the cell is empty before it can answer.

	NameError catches both: UnboundLocalError is its subclass, and a free
	variable of an enclosing scope that was never bound reports the base class.
	Nothing wider -- an error from evaluating the binding for any OTHER reason
	is a real error and must not be reported as emptiness."

	| r |
	r := self ___reader___.
	r isNil ifTrue: [^ PyCell ___emptyMarker___].
	^ [r value]
		on: NameError
		do: [:ex | ex return: PyCell ___emptyMarker___]

]

{ #category : 'Grail-private' }
PyCell >> ___setEmptier___: aZeroArgBlockOrNil [
	emptier := aZeroArgBlockOrNil

]

{ #category : 'Grail-private' }
PyCell >> ___setHolder___: anArray [
	holder := anArray

]

{ #category : 'Grail-private' }
PyCell >> ___setReader___: aZeroArgBlock setter: aOneArgBlockOrNil [

	reader := aZeroArgBlock.
	setter := aOneArgBlockOrNil.

]

{ #category : 'Grail-private' }
PyCell >> ___setter___ [

	^ setter

]
