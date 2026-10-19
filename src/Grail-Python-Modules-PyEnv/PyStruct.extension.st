Extension { #name : 'PyStruct' }

{ #category : 'Grail-Initialization' }
PyStruct class >> __new__: fmt [
	"Struct(format) - precompile a struct format string.  Phase B+1:
	stores the format into dynamic-instVar storage."

	| inst |
	inst := self @env0:new.
	"``Struct.__new__(Struct)'' spelled out in Python arrives HERE, with the CLASS
	as its argument -- the explicit-cls convention -- while ``Struct(fmt)''
	arrives with the format.  The explicit form allocates a Struct that
	__init__ has not run on, which CPython keeps as a distinct state: every
	operation refuses it (PyStruct >> format) and its size is -1.  Treating the
	class as a format string reported ``bad char in struct format'' instead
	(test_struct test_operations_on_half_initialized_Struct)."
	((fmt isKindOf: Behavior) and: [fmt == self or: [fmt @env0:inheritsFrom: PyStruct]])
		ifTrue: [^ fmt == self ifTrue: [inst] ifFalse: [fmt @env0:new]].
	inst @env0:dynamicInstVarAt: #_format put: (struct instance _validatedFormat: fmt).
	^ inst

]

{ #category : 'Grail-Accessors' }
PyStruct >> ___formatOrNil___ [
	"The stored format, or nil for a Struct that __init__ never ran on --
	``Struct.__new__(Struct)'' allocates one.  Guarded, because the slot is
	simply absent then, and an absent dynamic instVar is not a nil one."

	^ [self @env0:dynamicInstVarAt: #_format]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Initialization' }
PyStruct >> __init__: fmt [
	"Struct.__init__ is RE-CALLABLE: CPython lets ``s.__init__('>hh')''
	repoint an existing Struct at a new format, which
	test_Struct_reinitialization exercises directly.  Without it the
	instance kept the format __new__ gave it and silently ignored the
	second call.

	The format is VALIDATED before it is stored, so a rejected
	re-initialization leaves the previous format in place -- CPython's
	test_Struct_reinitialization packs with the OLD format after
	``s.__init__('$')'' raises.  Storing first would leave the instance
	holding a format it can neither pack nor unpack with."

	| normalized |
	normalized := struct instance _validatedFormat: fmt.
	self @env0:dynamicInstVarAt: #_format put: normalized.
	^ nil

]

{ #category : 'Grail-String Representation' }
PyStruct >> __repr__ [
	"CPython prints Struct('=i2H') -- the format REPR, quotes included."

	^ 'Struct(' @env0:, (builtins instance repr: self format) @env0:asString @env0:, ')'

]

{ #category : 'Grail-Accessors' }
PyStruct >> __sizeof__ [
	"Refuses a half-initialized Struct like every other operation, and is
	otherwise object's answer (object >> __sizeof__)."

	self format.
	^ self @env0:physicalSize

]

{ #category : 'Grail-Public' }
PyStruct >> _pack_into: positional kw: kwargs [
	"Struct.pack_into(buffer, offset, *values)."

	| values |
	positional @env0:size @env0:< 2 ifTrue: [
		^ TypeError ___signal___: 'pack_into() takes at least 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)'
	].
	values := positional @env0:copyFrom: 3 to: positional @env0:size.
	^ struct instance
		pack_into: self format
		_: (positional @env0:at: 1)
		_: (positional @env0:at: 2)
		args: values

]

{ #category : 'Grail-Public' }
PyStruct >> _pack: positional kw: kwargs [
	"Struct.pack(*values) - forward to struct.pack with our format."

	| args |
	args := { self format }.
	positional @env0:do: [:v | args := args @env0:, (Array @env0:with: v)].
	^ struct instance _pack: args kw: kwargs

]

{ #category : 'Grail-Public' }
PyStruct >> _unpack_from: positional kw: kwargs [
	"Struct.unpack_from(buffer, offset=0) - offset by position or keyword."

	| offset buf |
	buf := positional @env0:size @env0:>= 1
		ifTrue: [positional @env0:at: 1]
		ifFalse: [struct instance _kwAt: 'buffer' in: kwargs].
	buf == nil ifTrue: [
		^ TypeError ___signal___: 'unpack_from() missing required argument ''buffer'' (pos 1)'
	].
	offset := positional @env0:size @env0:>= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [struct instance _kwOffsetIn: kwargs].
	^ struct instance unpack_from: self format _: buf _: offset

]

{ #category : 'Grail-Accessors' }
PyStruct >> format [
	"Phase B+1: read from dynamic-instVar storage.

	Every operation reads the format through here, so this is also where a
	HALF-INITIALIZED Struct refuses: CPython raises ``RuntimeError: Struct
	object is not initialized'' from pack, unpack, iter_unpack, pack_into,
	format, __sizeof__ and repr alike.  Grail had no such state -- the missing
	format read as nil and reached the parser, which reported ``bad char in
	struct format'' (test_struct test_operations_on_half_initialized_Struct)."

	| fmt |
	fmt := self ___formatOrNil___.
	fmt == nil ifTrue: [
		^ RuntimeError ___signal___: 'Struct object is not initialized'].
	^ fmt

]

{ #category : 'Grail-Public' }
PyStruct >> iter_unpack: buffer [
	^ struct instance iter_unpack: self format _: buffer

]

{ #category : 'Grail-Accessors' }
PyStruct >> size [
	"-1 for a half-initialized Struct, as CPython reports -- the one read that
	does not refuse."

	self ___formatOrNil___ == nil ifTrue: [^ -1].
	^ struct instance calcsize: self format

]

{ #category : 'Grail-Public' }
PyStruct >> unpack_from: buffer [
	^ struct instance unpack_from: self format _: buffer _: 0

]

{ #category : 'Grail-Public' }
PyStruct >> unpack_from: buffer _: offset [
	^ struct instance unpack_from: self format _: buffer _: offset

]

{ #category : 'Grail-Public' }
PyStruct >> unpack: buffer [
	^ struct instance unpack: self format _: buffer

]
