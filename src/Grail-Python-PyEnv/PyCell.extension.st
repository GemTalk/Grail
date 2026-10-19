Extension { #name : 'PyCell' }

{ #category : 'Instance Creation' }
PyCell class >> __new__ [
	"``types.CellType()'' -- a new EMPTY cell.

	A classmethod named __new__ rather than an __init__: PyCell is
	Smalltalk-defined, so calling it lands in ``object class >> value:...'',
	which dispatches on arity to __new__ on the metaclass and never consults
	__init__."

	^ self @env0:___standaloneHolding___: (PyCell @env0:___emptyMarker___)

]

{ #category : 'Instance Creation' }
PyCell class >> __new__: aValue [
	"``types.CellType(v)'' -- a new cell holding v."

	^ self @env0:___standaloneHolding___: aValue

]

{ #category : 'Grail-Comparison' }
PyCell >> ___emptyPairWith___: other [
	"The pair (self empty?, other empty?), or nil when ``other'' is not a cell.

	CPython's cell_richcompare sorts an empty cell BEFORE every filled one and
	otherwise defers entirely to the contents -- which is why
	``cell(-36) == cell(-36.0)'' is true: that is int/float equality, nothing
	cell-specific.  Answering nil lets each comparison hand back NotImplemented
	so Python can try the reflected operation."

	(other @env0:isKindOf: PyCell) @env0:not ifTrue: [^ nil].
	^ { self @env0:___isEmpty___. other @env0:___isEmpty___ }

]

{ #category : 'Grail-Attribute Access' }
PyCell >> ___setCellContents___: aValue [
	"Backing for ``cell.cell_contents = value'' -- writes THROUGH to the
	enclosing binding via the setter block, so the defining scope and every
	other closure over that variable observe the new value."

	| s |
	s := self @env0:___setter___.
	s @env0:isNil ifTrue: [
		^ AttributeError ___signal___: 'readonly attribute'].
	s @env0:value: aValue.
	^ None

]

{ #category : 'Grail-Attribute Access' }
PyCell >> __delattr__: aName [
	"``del c.cell_contents'' -- empties the cell.

	A cell that knows how to empty itself does; one that does not refuses.  Both
	kinds Grail builds know how: a STANDALONE cell stores the empty marker in
	its holder, and a CLOSURE cell writes nil into the VariableContext slot the
	binding lives in, which UNBINDS the enclosing variable so the next read
	raises -- precisely CPython's behaviour, and what test_set_cell checks
	immediately afterwards.

	THIS USED TO SAY GRAIL COULD NOT UNBIND A SMALLTALK TEMP, and refused on
	that ground.  That was wrong: ``VariableContext >> _at:put:'' writes the
	slot (the public ``at:put:'' is deliberately shouldNotImplement), and a
	Grail-compiled read of an unassigned local already raises UnboundLocalError
	when it finds nil.  The refusal was guarding against a SENTINEL escaping
	into the defining scope, which is a real hazard for the marker but not for
	nil.

	A cell with no emptier -- one built from a def-site reader Grail could not
	decode into a slot -- still refuses, because for that one there is no
	binding to reach."

	(aName @env0:asString @env0:= 'cell_contents') @env0:not ifTrue: [
		^ AttributeError ___signal___:
			('cell object has no attribute ' , aName @env0:asString)].
	(self @env0:___emptier___) @env0:isNil ifTrue: [
		^ ValueError ___signal___:
			'cannot clear a closure cell: it would unbind the enclosing variable'].
	(self @env0:___emptier___) @env0:value.
	^ None

]

{ #category : 'Grail-Comparison' }
PyCell >> __eq__: other [
	| k |
	k := self ___emptyPairWith___: other.
	k @env0:isNil ifTrue: [^ NotImplemented].
	((k @env0:at: 1) @env0:or: [k @env0:at: 2])
		ifTrue: [^ (k @env0:at: 1) @env0:= (k @env0:at: 2)].
	^ self cell_contents @env1:__eq__: other cell_contents

]

{ #category : 'Grail-Comparison' }
PyCell >> __ge__: other [
	| l |
	l := self @env1:__lt__: other.
	(l @env0:== NotImplemented) ifTrue: [^ NotImplemented].
	^ (l @env1:__bool__) @env0:not

]

{ #category : 'Grail-Comparison' }
PyCell >> __gt__: other [
	| k |
	k := self ___emptyPairWith___: other.
	k @env0:isNil ifTrue: [^ NotImplemented].
	(k @env0:at: 2) ifTrue: [^ (k @env0:at: 1) @env0:not].
	(k @env0:at: 1) ifTrue: [^ false].
	^ self cell_contents @env1:__gt__: other cell_contents

]

{ #category : 'Grail-Comparison' }
PyCell >> __le__: other [
	| g |
	g := self @env1:__gt__: other.
	(g @env0:== NotImplemented) ifTrue: [^ NotImplemented].
	^ (g @env1:__bool__) @env0:not

]

{ #category : 'Grail-Comparison' }
PyCell >> __lt__: other [
	| k |
	k := self ___emptyPairWith___: other.
	k @env0:isNil ifTrue: [^ NotImplemented].
	(k @env0:at: 1) ifTrue: [^ (k @env0:at: 2) @env0:not].
	(k @env0:at: 2) ifTrue: [^ false].
	^ self cell_contents @env1:__lt__: other cell_contents

]

{ #category : 'Grail-Comparison' }
PyCell >> __ne__: other [
	| e |
	e := self @env1:__eq__: other.
	(e @env0:== NotImplemented) ifTrue: [^ NotImplemented].
	^ (e @env1:__bool__) @env0:not

]

{ #category : 'Grail-Printing' }
PyCell >> __repr__ [
	"``<cell at 0xADDR: EMPTY>'' / ``<cell at 0xADDR: TYPE object at 0xADDR>'',
	shaped like CPython's.  Nothing conformance-critical reads this."

	| stream contents typeName |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<cell at 0x'.
	stream @env0:nextPutAll:
		(self @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase.
	stream @env0:nextPutAll: ': '.
	contents := self @env0:___readOrMarker___.
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
				(contents @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase].
	stream @env0:nextPut: $>.
	^ stream @env0:contents

]

{ #category : 'Grail-Attribute Access' }
PyCell >> __setattr__: aName _: aValue [
	"``c.cell_contents = v''.  Without this the assignment fell through to the
	generic object path and created a DYNAMIC INSTVAR shadowing the accessor, so
	the write appeared to succeed while the next read still answered the old
	value -- test_funcattrs' test_set_cell saw ``12 != 9''.  Every other name is
	refused: CPython's cell has no other writable attribute."

	(aName @env0:asString @env0:= 'cell_contents')
		ifTrue: [^ self ___setCellContents___: aValue].
	^ AttributeError ___signal___:
		('cell object has no attribute ' , aName @env0:asString)

]

{ #category : 'Grail-Attribute Access' }
PyCell >> cell_contents [
	"``cell.cell_contents'' -- the CURRENT value of the closed-over binding.

	Evaluates the reader block, so this tracks assignments made after the cell
	was built, which is the whole point of a cell.  #'cell_contents' is in
	___pythonValueAttrs___ so a read answers the value rather than a
	BoundMethod wrapping this selector."

	| v |
	"Every way of being empty funnels through one read -- see
	___readOrMarker___.  The marker must not be allowed to escape into Python,
	where it would read as some ordinary object rather than raising."
	v := self @env0:___readOrMarker___.
	(v @env0:== (PyCell @env0:___emptyMarker___)) ifTrue: [
		^ ValueError ___signal___: 'Cell is empty'].
	^ v

]
