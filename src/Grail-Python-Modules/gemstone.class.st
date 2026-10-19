"Python gemstone module.

Provides basic metadata about the Grail runtime and interoperability
with existing GemStone data and operations:

  * gemstone.system — the GemStone System class.  Transaction control
    goes through it: gemstone.system.commit() / gemstone.system.abort()
    (env-1 class-side methods on System, installed by System.gs).
  * gemstone.mySymbolList — a list of the session's SymbolDictionary
    instances (GsCurrentSession currentSession symbolList).
  * gemstone[name] — namespace lookup via the subscript protocol.

Methods on this class are real env-1 fast-path methods, dispatched
directly via `gemstone.method(args)` Python calls compiled to
`((gemstone instance) method: args)` Smalltalk sends.  Value attributes
(system, mySymbolList, version) live in the Grail-Accessors category so
attribute reads perform them instead of wrapping a BoundMethod.

"
Class {
	#name : 'gemstone',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
