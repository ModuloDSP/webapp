import { bilinearTransform, getCausalButterworthPoles, H_of_s, countNumberOfOccurrences, filter, lowPassImpulseResponse, bandpassImpulseResponse, elementWiseMultiply, elementWiseAdd, Hamming, Bartlett, Han, WindowingMethodDesign, AnalogToDigitalTransformationDesign } from "../../core";
import { AnalogToDigitalTransformationDesignMethod, FilterType, WindowType } from "../../core/enums";

let vars = {};
const INVALID_COMMAND_MESSAGE = "Invalid usage! Type 'help' for assistance.";

export const parse = (cmd, log, updateLog, updateCmd) => {
    // Example usage
    // const params = [
    //     { type: "enum", valid_values: ["lowpass", "highpass"] },
    //     { type: "int" },
    //     { type: "int" },
    //     { type: "float", optional: true },
    // ];
    // Returns:
    // "^\s*butterworth\s*\(\s*(lowpass|highpass)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:\s*,\s*([0-9]*\.?[0-9]+)\s*)?\s*\)\s*$"
    const rgxBuilder = (
        name: string,
        params: { type: string; valid_values?: string[], optional? }[]
    ): RegExp => {

        let paramsStr = "";

        for (let i = 0; i < params.length; i++) {
            const p = params[i];
            let tmp = ""
            switch (p.type) {
                case 'enum':
                    tmp = `\\s*(${p.valid_values?.join('|')})\\s*`;
                    break;
                case 'string':
                    tmp = `\\s*([\\w\\s]+)\\s*`;
                    break;
                case 'int':
                    tmp = `\\s*(\\d+)\\s*`;
                    break;
                case 'float':
                    tmp = `\\s*([0-9]*\\.?[0-9]+)\\s*`;
                    break;
                default:
                    throw new Error(`Unknown type: ${p.type}`);
            }  
            if (p.optional && p.optional == true) {
                tmp = `(?:\\s*,${tmp})?\\s*`;
            } else if (i != params.length - 1) {
                tmp += `,`;
            }
            paramsStr += tmp;
        }

        // Whitespace* + name + ( + paramters + )
        return RegExp(`^\\s*${name}\\s*\\(${paramsStr}\\)\\s*$`);
    };

    const rgx =
    {
        variableDecl: /\s*([a-z]+)\s*=\s*\[(.*)\]\s*$/,
        listVariables: /^\s*list\s*$/,
        clearVariables: /^\s*reset\s*$/,
        filter: /^\s*filter\s*\((.*)\)\s*$/,
        windowing: rgxBuilder("windowing", [
            {type: "enum", valid_values: ["lowpass", "highpass", "bandpass", "bandstop"]},
            {type: "enum", valid_values: ["rectangular", "hamming", "han", "bartlett"]},
            {type: "int" },
            {type: "float" },
            {type: "float", optional: true },
        ]),
        // windowing: /^^\s*windowing\s*\(\s*(lowpass|highpass|bandpass|bandstop)\s*,\s*(rectangular|hamming|han|bartlett)\s*,\s*(\d+)\s*,\s*([0-9]*\.?[0-9]+)(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)\s*$/,
        analogToDigital: rgxBuilder("analogToDigital", [
            {type: "enum", valid_values: ["butterworth", "chebyshev"]},
            {type: "enum", valid_values: ["lowpass", "highpass"]},
            {type: "int" },
            {type: "float" },
        ]),
    }

    const patterns: {
        regex: RegExp;
        action: () => void;}[] = [
        { regex: /^\s*clear\s*$/, action: () => updateLog(["Cleared..."]) },
        { regex: /^\s*help\s*$/, action: () => help(log, updateLog) },
        { regex: /^\s*version\s*$/, action: () => version(log, updateLog) },
        { regex: rgx.variableDecl, action: () => declareVariable(rgx.variableDecl, cmd, log, updateLog) },
        { regex: rgx.listVariables, action: () => listVariables(log, updateLog) },
        { regex: rgx.clearVariables, action: () => clearVariables(log, updateLog) },
        { regex: rgx.filter, action: () => execFilter(rgx.filter, cmd, log, updateLog) },
        { regex: rgx.windowing, action: () => execWindowing(rgx.windowing, cmd, log, updateLog) },
        { regex: rgx.analogToDigital, action: () => execAnalogToDigital(rgx.analogToDigital, cmd, log, updateLog) },
    ];
    for (let i = 0; i < patterns.length; i++) {
        console.log(patterns[i].regex)
        if (patterns[i].regex.test(cmd)) {
            patterns[i].action();
            break;
        }
        if (i == patterns.length - 1) cmdNotFound(cmd, log, updateLog);
    }

    updateCmd("");
}

const help = (log, updateLog) => {
    const text = [
        "\n",
        "ModuloDSP version 0.2",
        "Available commands:",
        "\t 'help' - Shows the help message",
        "\t 'version' - Shows the web apps version",
        "\t 'clear' - Clears the screen",
        "\t 'reset' - Deletes the declared variables in your session",
        "\nVariable decleration:",
        "\t a = [x y z] - Declares a list named 'a' with the elements x, y and z",
        "\nAvailable methods:",
        "\tfilter(x,a,b) - Performs filtering on the input 'x', with the coefficients of its transfer function \n\tdefined using the list 'a' for the numerator and the list 'b' for the denominator",
        "\t\n",
        "\twindowing(filter_type, window_type, N, w_c, w_s) - Designs a filter with the windowing method.\t",
        "\t\tfilter_type: 'lowpass', 'highpass', 'bandpass' or 'banstop' - Type of the filter\n",
        "\t\twindow_type: 'rectangular', 'hamming', 'han', 'bartlett' - Type of the window \n",
        "\t\tN: An integer - Filter order \n",
        "\t\tw_c: A float - Normalized frequency in radians per samples denoting start of cutoff frequency\n",
        "\t\tw_s (optional): A float - Normalized frequency in radians per samples denoting stop cutoff frequency for BP and BS filter\n",
        "\t\n",
        "\tanalogToDigital(method, filter_type, N, w_c) - Designs a filter via Analog-to-digital transformation method.\t",
        "\t\tmethod: 'butterworth' or 'chebyshev'' - Type of design method\n",
        "\t\tfilter_type: 'lowpass' or 'highpass'' - Type of filter\n",
        "\t\tN: An integer - Filter order \n",
        "\t\tw_c: A float - Normalized frequency in radians per samples denoting cutoff frequency\n",
    ];
    updateLog(log.concat(text));
}

const cmdNotFound = (cmd, log, updateLog) => {
    const text = [
        "Command '" + cmd + "' not found! Enter 'help' for addtional information."
    ];
    updateLog(log.concat(text));
}

const version = (log, updateLog) => {
    const text = ["\n", "Version 0.2 - Nov 19 2024"]
    updateLog(log.concat(text));
}

const declareVariable = (rgx, cmd, log, updateLog) => {
    const match = rgx.exec(cmd);

    const key = match[1];
    const values = match[2];

    vars[key] = values.split(/\s+/);

    const text = ["\n", `> ${key} = [${values}]`]
    updateLog(log.concat(text));

}

const listVariables = (log, updateLog) => {
    const text = [
        "Active variables: ", JSON.stringify(vars).replace(/"/g, '')
    ];
    updateLog(log.concat(text));
}

const clearVariables = (log, updateLog) => {
    vars = {};
    const text = ["Variables cleared", JSON.stringify(vars).replace(/"/g, '')]
    updateLog(log.concat(text));
}

const execFilter = (rgx, cmd, log, updateLog) => {

    const match = rgx.exec(cmd);
    const expr = match[1];
    if (countNumberOfOccurrences(expr, ",") != 2) {
        const text = ["\n", INVALID_COMMAND_MESSAGE]
        console.log(countNumberOfOccurrences(expr, ","))
        updateLog(log.concat(text));
        return;
    }
    let den = [];
    let num = [];
    let x = [];

    const args = expr.split(",");
    let m_var = args[0].match(/\s*([a-zA-Z])+\s*/);
    let m_brac = args[0].match(/\s*\[(.*)\]\s*/);
    if (m_var && m_var[1] !== undefined) {
        x = vars[m_var[1]];
    } else if (m_brac) {
        x = m_brac[1].split(/\s+/)
    }

    m_var = args[1].match(/\s*([a-zA-Z])+\s*/);
    m_brac = args[1].match(/\s*\[(.*)\]\s*/);
    if (m_var && m_var[1] !== undefined) {
        num = vars[m_var[1]];
    } else if (m_brac) {
        num = m_brac[1].split(/\s+/)
    }

    m_var = args[2].match(/\s*([a-zA-Z])+\s*/);
    m_brac = args[2].match(/\s*\[(.*)\]\s*/);
    if (m_var && m_var[1] !== undefined) {
        den = vars[m_var[1]];
    } else if (m_brac) {
        den = m_brac[1].split(/\s+/)
    }

    const text = ["\n", "[" + filter(x, { den: den, num: num }).toString() + "]"]
    updateLog(log.concat(text));
}



const execWindowing = (rgx, cmd, log, updateLog) => {
    const match = rgx.exec(cmd);
    const coef = WindowingMethodDesign(match[1] as FilterType, match[2] as WindowType, match[3], match[4], match[5]);
    const text = ["\n", "> " + cmd, coef.num.join(' ')]
    updateLog(log.concat(text));
}

const execAnalogToDigital = (rgx, cmd, log, updateLog) => {
    const match = rgx.exec(cmd);
    const coef = AnalogToDigitalTransformationDesign(match[1] as AnalogToDigitalTransformationDesignMethod, match[2] as FilterType, match[3], match[4], match[4]);

    const text = ["\n", "> " + cmd, "num:" + coef.num.join(' ') + " den:" + coef.den.join(' ')]
    updateLog(log.concat(text));
}

