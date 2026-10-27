Extension { #name : 'TypeAliasType' }

{ #category : 'Grail-Instance Creation' }
TypeAliasType class >> ___named___: aString valueThunk: aBlock [
	"Build the alias of a plain ``type X = V''.  aBlock is NOT run here --
	see the class comment for why the laziness is load-bearing.

	It is typing.TypeAliasType's instance, the one a generic ``type X[T] = V''
	and an explicit call already made (_typing._grail_type_alias), not this
	class's: one statement answered two types, so ``isinstance(X,
	typing.TypeAliasType)'' was false for the plain form, and it had no
	__module__ or evaluate_value.  The block stays the thunk because it is
	what reads a class body's names lazily (``class X: T = int; type U = T''),
	wrapped in a Python callable's (positional, keywords) shape."

	^ (((importlib @env0:___instance___) @env1:import_module: '_typing')
		@env1:___pyAttrLoad___: #'_grail_type_alias')
			@env1:value: {
				aString @env0:asUnicodeString.
				[:positional :keywords | aBlock @env0:value].
				tuple @env0:new }
			value: nil

]

{ #category : 'Grail-Attribute' }
TypeAliasType >> ___pyAttrLoad___: aSym [
	"__name__ / __value__ / __type_params__ are ATTRIBUTES, not methods.

	Defining them as zero-arg methods made ``Alias.__name__'' answer a
	BoundMethod -- an object, printed without complaint, so the mistake
	read as a working attribute right up until something compared it.
	Grail's convention for a value-attribute is a dynamic instVar
	(GenericAlias stores __origin__ that way); __value__ cannot be one
	because it is LAZY, so it is intercepted here instead."

	aSym @env0:== #'__value__' ifTrue: [^ self ___value___].
	aSym @env0:== #'__name__' ifTrue: [^ aliasName @env0:asUnicodeString].
	aSym @env0:== #'__type_params__' ifTrue: [^ typeParams].
	^ super ___pyAttrLoad___: aSym

]

{ #category : 'Grail-Private' }
TypeAliasType >> ___setName___: aString thunk: aBlock [
	aliasName := aString.
	valueThunk := aBlock.
	evaluated := false.
	typeParams := tuple @env0:new

]

{ #category : 'Grail-Attribute' }
TypeAliasType >> ___value___ [
	"Evaluate on FIRST access, then keep the answer.

	``evaluated'' rather than a nil check on evaluatedValue: an alias whose
	value legitimately IS None (``type C1 = None'', which
	test_annotationlib writes twice) would otherwise re-run its thunk on
	every access -- harmless for a literal, not harmless for a value with
	a cost or a side effect."

	evaluated @env0:== true ifTrue: [^ evaluatedValue].
	evaluatedValue := valueThunk @env0:value.
	evaluated := true.
	valueThunk := nil.
	^ evaluatedValue

]

{ #category : 'Grail-String Representation' }
TypeAliasType >> __repr__ [
	"CPython prints the bare name -- ``Alias'', not ``TypeAliasType(...)''
	-- and annotation-formatting code depends on it."

	^ aliasName @env0:asUnicodeString

]

{ #category : 'Grail-String Representation' }
TypeAliasType >> __str__ [
	^ self __repr__

]
