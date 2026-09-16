## Progress — cut 35 (late-bound module names)

The census's first actionable row: 32 stdlib defs (re._compiler's star import
of _constants foremost) refused because a bare name was neither a local, a
module variable, a top-level def nor a symbol-list global.  The text path's
answer for such a name is its late module-name binding -- the same
``self @env1:___moduleAttrLoad___: #name'' runtime lookup it emits for a module
variable, raising NameError on a miss -- so ___irNonLocalLoadKind___: now
answers #module for it instead of nil.  The remaining nil exits are the
earlier text dispatcher branches (super / __class__ / type, reserved
identifiers, a builtin function read as a value).  Fixture: read_dynamic over
a ``globals().update'' binding; compiled 137 -> 138.
