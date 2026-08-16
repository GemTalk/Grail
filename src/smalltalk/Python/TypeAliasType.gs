! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- TypeAliasType class (Python 'typing.TypeAliasType')
expectvalue /Class
doit
object subclass: 'TypeAliasType'
  instVarNames: #( aliasName valueThunk evaluatedValue evaluated typeParams )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
TypeAliasType comment:
'The object PEP 695''s ``type X = int'' statement binds.

    >>> type Alias = tuple[int, int]
    >>> Alias
    Alias
    >>> Alias.__value__
    tuple[int, int]

The VALUE IS LAZY, and that is the whole point rather than an
optimisation: PEP 695 evaluates it on first access to ``__value__'', so
an alias may name something defined later in the module, or name ITSELF:

    type Json = int | str | list[Json] | dict[str, Json]

Evaluating eagerly turns that into a NameError at the point of
definition.  So the statement stores a thunk, and the thunk runs once --
``evaluated'' distinguishes ``not yet run'' from ``ran and answered
nil'', which a nil check alone cannot do.

repr() is the bare NAME, not a constructor-shaped string: CPython prints
``Alias'', and code that builds error messages out of annotations relies
on it.

Instance variables:
  aliasName      - the name the statement bound (a String)
  valueThunk     - zero-arg block answering the value; nil once run
  evaluatedValue - the thunk''s answer, once it has run
  evaluated      - true once the thunk has run
  typeParams     - the __type_params__ tuple; always empty for now
'
%

expectvalue /Class
doit
TypeAliasType category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
TypeAliasType removeAllMethods: 1.
TypeAliasType class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: TypeAliasType
___named___: aString valueThunk: aBlock
	"Build the alias.  aBlock is NOT run here -- see the class comment for
	why the laziness is load-bearing."

	| inst |
	inst := self ___new___.
	inst ___setName___: aString thunk: aBlock.
	^ inst
%

category: 'Grail-Private'
method: TypeAliasType
___setName___: aString thunk: aBlock
	aliasName := aString.
	valueThunk := aBlock.
	evaluated := false.
	typeParams := tuple @env0:new
%

category: 'Grail-Attribute'
method: TypeAliasType
___pyAttrLoad___: aSym
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
%

category: 'Grail-Attribute'
method: TypeAliasType
___value___
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
%

category: 'Grail-String Representation'
method: TypeAliasType
__repr__
	"CPython prints the bare name -- ``Alias'', not ``TypeAliasType(...)''
	-- and annotation-formatting code depends on it."

	^ aliasName @env0:asUnicodeString
%

category: 'Grail-String Representation'
method: TypeAliasType
__str__
	^ self __repr__
%

set compile_env: 0
