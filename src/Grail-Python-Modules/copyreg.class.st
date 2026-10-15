"Python copyreg module.

Provides pickle/copy dispatch table registration.

Currently a minimal stub: `pickle(ob_type, pickle_function[,
constructor])` records `ob_type → pickle_function` in `dispatch_table`,
ignoring the `constructor` argument. The `re` module uses this to
register a pickler for compiled regex patterns
(`copyreg.pickle(Pattern, _pickle, _compile)`).

Methods on this class are real env-1 fast-path methods, dispatched
directly via `copyreg.method(args)` Python calls compiled to
`((copyreg) method: args)` Smalltalk sends.

See https://docs.python.org/3/library/copyreg.html

"
Class {
	#name : 'copyreg',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
