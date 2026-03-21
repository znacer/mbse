import type { UAFDomain, UAFData } from "$lib/types/mbse.js";

const DOMAIN_COLORS: Record<string, string> = {
	Operational: "#3B82F6",
	Services: "#22C55E",
	Resources: "#F97316",
	Strategic: "#A855F7",
	Personnel: "#EAB308",
	Security: "#EF4444",
	Projects: "#14B8A6",
	"Architecture Management": "#6366F1",
	Standards: "#6B7280",
	"Actual Resources": "#F59E0B",
	"Summary and Overview": "#06B6D4",
	Parameters: "#64748B"
};

function normalizeDomainName(name: string): string {
	const normalized = name.trim();
	return DOMAIN_COLORS[normalized] ? normalized : "Parameters";
}

export async function parseUAF(): Promise<UAFData> {
	if (typeof window === "undefined") {
		const domains = new Map<string, UAFDomain>();
		const stereotypeToDomain = new Map<string, string>();
		initializeDefaultDomains(domains, stereotypeToDomain);
		return { domains, stereotypeToDomain };
	}

	try {
		const response = await window.fetch("/UAF.xmi");
		const text = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "application/xml");

		const domains = new Map<string, UAFDomain>();
		const stereotypeToDomain = new Map<string, string>();

		const profile = doc.querySelector('uml\\:Profile, Profile[name="UAF"]');
		if (!profile) {
			console.warn("UAF profile not found, using default domains");
			initializeDefaultDomains(domains, stereotypeToDomain);
			return { domains, stereotypeToDomain };
		}

		const packages = profile.querySelectorAll(
			'\\:packagedElement, packagedElement[type="uml\\:Package"], packagedElement[xmi\\:type="uml\\:Package"]'
		);

		for (const pkg of packages) {
			const domainName = pkg.getAttribute("name");
			if (!domainName) continue;

			const stereotypes = pkg.querySelectorAll(
				'\\:packagedElement, packagedElement[xmi\\:type="uml\\:Stereotype"]'
			);

			const stereotypeNames: string[] = [];
			for (const stereotype of stereotypes) {
				const stereoName = stereotype.getAttribute("name");
				if (stereoName) {
					stereotypeNames.push(stereoName);
					stereotypeToDomain.set(stereoName, domainName);
				}
			}

			const normalizedDomain = normalizeDomainName(domainName);
			domains.set(normalizedDomain, {
				name: normalizedDomain,
				color: DOMAIN_COLORS[normalizedDomain] || "#64748B",
				stereotypes: stereotypeNames
			});
		}

		for (const [domainName, color] of Object.entries(DOMAIN_COLORS)) {
			if (!domains.has(domainName)) {
				domains.set(domainName, {
					name: domainName,
					color,
					stereotypes: []
				});
			}
		}

		return { domains, stereotypeToDomain };
	} catch (error) {
		console.warn("Failed to parse UAF.xmi, using default domains:", error);
		const domains = new Map<string, UAFDomain>();
		const stereotypeToDomain = new Map<string, string>();
		initializeDefaultDomains(domains, stereotypeToDomain);
		return { domains, stereotypeToDomain };
	}
}

function initializeDefaultDomains(
	domains: Map<string, UAFDomain>,
	stereotypeToDomain: Map<string, string>
): void {
	const defaultStereotypes: Record<string, string[]> = {
		Operational: [
			"OperationalPerformer",
			"OperationalArchitecture",
			"OperationalRole",
			"OperationalAgent",
			"OperationalActivity",
			"OperationalExchange",
			"OperationalInterface"
		],
		Services: [
			"ServiceInterface",
			"ServiceOperation",
			"ServiceMessage",
			"ServiceProvider",
			"ServiceConsumer"
		],
		Resources: [
			"ResourcePerformer",
			"ResourceArchitecture",
			"ResourceExchange",
			"ResourceInterface"
		],
		Strategic: [
			"StrategicGoal",
			"StrategicObjective",
			"StrategicPlan",
			"Capability"
		],
		Personnel: ["Person", "PersonType", "Post", "Responsibility"],
		Security: [
			"SecurityDomain",
			"SecurityClassification",
			"SecurityEnclave"
		],
		Projects: [
			"Project",
			"ProjectMilestone",
			"ProjectVersion",
			"ProjectActivity"
		],
		"Architecture Management": [
			"Architecture",
			"ArchitectureViewpoint",
			"ArchitectureFramework"
		],
		Standards: ["Standard", "StandardItem", "StandardProfile"],
		"Actual Resources": [
			"ActualOrganization",
			"ActualPerson",
			"ActualPost",
			"ActualResource"
		],
		"Summary and Overview": ["Summary", "Overview", "AV"],
		Parameters: ["Parameter", "ParameterSet", "ParameterValue"]
	};

	for (const [domainName, stereotypes] of Object.entries(
		defaultStereotypes
	)) {
		domains.set(domainName, {
			name: domainName,
			color: DOMAIN_COLORS[domainName],
			stereotypes
		});

		for (const stereotype of stereotypes) {
			stereotypeToDomain.set(stereotype, domainName);
		}
	}
}

export function getDomainForStereotype(
	stereotype: string,
	uafData: UAFData
): string {
	const domain = uafData.stereotypeToDomain.get(stereotype);
	if (domain) return domain;

	if (stereotype.startsWith("Operational")) return "Operational";
	if (stereotype.startsWith("Service")) return "Services";
	if (stereotype.startsWith("Resource")) return "Resources";
	if (stereotype.startsWith("Strategic")) return "Strategic";
	if (stereotype.startsWith("Person")) return "Personnel";
	if (stereotype.startsWith("Security")) return "Security";
	if (stereotype.startsWith("Project")) return "Projects";
	if (stereotype.startsWith("Actual")) return "Actual Resources";
	if (stereotype.includes("Architecture")) return "Architecture Management";
	if (stereotype.startsWith("Standard")) return "Standards";
	if (stereotype.startsWith("Parameter")) return "Parameters";

	return "Parameters";
}

export function getDomainColor(domain: string, uafData: UAFData): string {
	const domainData = uafData.domains.get(domain);
	return domainData?.color || DOMAIN_COLORS[domain] || "#64748B";
}
