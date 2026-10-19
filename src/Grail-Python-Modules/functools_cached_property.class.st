"Python functools.cached_property as a REAL descriptor class: the first
read through an instance computes ``func(instance)' and stores the
result in the instance's own attribute store, so every later read is
the cached value with no call at all.

It used to be a pass-through stub (``^ aFunction'), which made every
read RE-INVOKE the function -- the exact opposite of what the decorator
promises -- and made ``Cls.attr' answer the function rather than the
descriptor.

State lives in dynamic instVars func / attrname / __doc__, so attribute
reads resolve through the standard PythonInstance probe.  ``attrname'
is filled in by __set_name__, which Object >> ___pyClassDefined___:
sends for every class-body entry at class-definition time.

Distinct from the PARSE-TIME realisation of a bare ``@cached_property'
(ClassDefAst emitGeneratedAccessors), which flask / werkzeug / django
depend on and which is untouched.  This class serves the ATTRIBUTE-ACCESS
decorator form (``@functools.cached_property'), the value form
(``x = cached_property(f)'), and direct construction."
Class {
	#name : 'functools_cached_property',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}
