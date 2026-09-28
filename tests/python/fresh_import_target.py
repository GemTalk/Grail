"""An import target nothing else imports -- see struct_buffers_and_half_init.py.

import_fresh_module takes its genuinely-fresh path only for a module that is not
already in sys.modules, so the check that exercises that path needs a module no
other test, fixture or stdlib import will have loaded first.  This is that
module; it deliberately does nothing.
"""

VALUE = 42
