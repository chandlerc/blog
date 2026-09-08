trait X {}
impl<'a, T> X for T where &'a T: X {}
