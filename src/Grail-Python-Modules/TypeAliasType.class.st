"The object PEP 695's ``type X = int' statement binds.

    >>> type Alias = tuple[int, int]
    >>> Alias
    Alias
    >>> Alias.__value__
    tuple[int, int]

The VALUE IS LAZY, and that is the whole point rather than an
optimisation: PEP 695 evaluates it on first access to ``__value__', so
an alias may name something defined later in the module, or name ITSELF:

    type Json = int | str | list[Json] | dict[str, Json]

Evaluating eagerly turns that into a NameError at the point of
definition.  So the statement stores a thunk, and the thunk runs once --
``evaluated' distinguishes ``not yet run' from ``ran and answered
nil', which a nil check alone cannot do.

repr() is the bare NAME, not a constructor-shaped string: CPython prints
``Alias', and code that builds error messages out of annotations relies
on it.

Instance variables:
  aliasName      - the name the statement bound (a String)
  valueThunk     - zero-arg block answering the value; nil once run
  evaluatedValue - the thunk's answer, once it has run
  evaluated      - true once the thunk has run
  typeParams     - the __type_params__ tuple; always empty for now

"
Class {
	#name : 'TypeAliasType',
	#superclass : 'object',
	#instVars : [
		'aliasName',
		'valueThunk',
		'evaluatedValue',
		'evaluated',
		'typeParams'
	],
	#category : 'Grail-Modules'
}
