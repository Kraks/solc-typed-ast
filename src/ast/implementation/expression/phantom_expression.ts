import { Expression } from "./expression";

export class PhantomExpression extends Expression {
    /**
     * The content of the phantom expression
     */
    content: string;

    constructor(id: number, src: string, typeString: string, content: string, raw?: any) {
        super(id, src, typeString, raw);

        this.content = content;
    }
}
