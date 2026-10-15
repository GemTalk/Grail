Extension { #name : 'NamedIntConstant' }

{ #category : 'Grail-Instance Creation' }
NamedIntConstant class >> __new__: aValue _: aName [
	"Python fast-path instantiation entry point —
	``NamedIntConstant(value, name)`` compiles to
	``NamedIntConstant @env1:__new__: value _: name`` via
	CallAst's bareCallClassNewSelector discriminator."

	^ self @env0:value: aValue name: aName

]

{ #category : 'Grail-Instance Creation' }
NamedIntConstant class >> value: positional value: keywords [
	"Legacy call-form entry point — fires when the call site can't
	resolve the receiver as a known class at codegen time (e.g.
	``_NamedIntConstant = NamedIntConstant`` then
	``_NamedIntConstant(v, n)`` — the alias isn't in the Python
	dictionary, so bareCallClassNewSelector returns nil and the
	codegen emits the generic ``value:value:`` form)."

	^ self @env0:value: (positional @env0:at: 1) name: (positional @env0:at: 2)

]

{ #category : 'Grail-Python Protocol' }
NamedIntConstant >> __repr__ [
	"`repr(named)` — the symbolic name.  This is the whole point of the
	wrapper: debug dumps show ``LITERAL`` rather than ``16``.  Overrides
	AbstractPyInt's value-based repr."

	^ self name

]

{ #category : 'Grail-Python Protocol' }
NamedIntConstant >> name [
	"Python attribute access — ``constant.name`` returns the symbolic
	name passed at construction (read from dynamic-instVar storage)."

	^ self @env0:dynamicInstVarAt: #name

]

{ #category : 'Grail-Python Protocol' }
NamedIntConstant >> name: aValue [
	"The ``name`` slot is read-only.  Python ``setattr(c, 'name', x)``
	hits this method and gets AttributeError instead of silently
	overwriting."

	AttributeError ___signal___: 'attribute ''name'' is read-only on NamedIntConstant'

]
